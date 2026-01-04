# Expense Distribution Widget - Implementation Plan

## Overview
Add a new dashboard widget that displays expense distribution by category as an interactive pie chart with tooltip on tap.

## Requirements
- Independent time period selection (Last 12 weeks, Last year, From start)
- Pie chart showing expenses grouped by category
- Percentage and amount per category
- Interactive: tapping a slice shows tooltip with details
- Only EXPENSE transactions (exclude INCOME)

---

## Query Optimization Strategy

### Problem
Datastore does **NOT support GROUP BY** in aggregation queries. Fetching all transactions and processing in-memory is inefficient and costly.

### Solution: Parallel SUM Aggregation Queries Per Category

Since categories are a fixed, known set (13 expense categories), we can run **parallel SUM queries** - one per category. This approach:

1. **Reduces read units**: Only reads index entries, not full entities
2. **Leverages Datastore aggregation**: Uses native `SUM(amount)` which is optimized
3. **Parallelizable**: Run all category queries concurrently using `CompletableFuture`
4. **Scalable**: Cost is O(categories) not O(transactions)

### Required Datastore Index
Add to `index.yaml`:
```yaml
- kind: transactions
  properties:
    - name: owner
    - name: type
    - name: category
    - name: date
```

This composite index enables the query:
```sql
SELECT SUM(amount) FROM transactions
WHERE owner = @owner AND type = 'EXPENSE' AND category = @category
AND date >= @startDate AND date <= @endDate
```

### Alternative Considered: Fetch Minimal Projection
If aggregation per category isn't supported by Spring Data Datastore, use projection query:
```sql
SELECT category, amount FROM transactions
WHERE owner = @owner AND type = 'EXPENSE' AND date >= @startDate AND date <= @endDate
```
This fetches only 2 fields instead of all 12 fields per entity, reducing read costs.

---

## Files to Create

### Backend (5 files)

| File | Purpose |
|------|---------|
| `backend/src/main/java/com/lazyspender/backend/config/ExpenseConfigProperties.java` | Configuration properties for expense categories |
| `backend/src/main/java/com/lazyspender/backend/dto/ExpenseDistributionItem.java` | DTO for single category item |
| `backend/src/main/java/com/lazyspender/backend/dto/ExpenseDistributionResponse.java` | API response DTO |
| `backend/src/main/java/com/lazyspender/backend/service/ExpenseDistributionService.java` | Business logic with optimized queries |
| `backend/src/main/java/com/lazyspender/backend/controller/ExpenseDistributionController.java` | REST endpoint |

### Frontend (4 files)

| File | Purpose |
|------|---------|
| `frontend/types/expenseDistribution.ts` | TypeScript interfaces |
| `frontend/services/expenseDistribution.service.ts` | API client |
| `frontend/hooks/useExpenseDistribution.ts` | React Query hook |
| `frontend/components/ExpenseDistributionWidget.tsx` | Widget component |

## Files to Modify

| File | Change |
|------|--------|
| `frontend/app/dashboard.tsx` | Import and render ExpenseDistributionWidget |
| `backend/src/main/java/.../TransactionRepository.java` | Add SUM query method for category |
| `backend/src/main/resources/datastore/index.yaml` | Add composite index |
| `backend/src/main/resources/application.yaml` | Add expense categories configuration |

---

## API Design

### Endpoint: `GET /api/expense-distribution`

**Parameters:**
- `owner` (string) - User owner ID
- `accounts` (string[]) - Account names to include
- `period` (TrendPeriod) - LAST_12_WEEKS, LAST_YEAR, or FROM_START

**Response:**
```json
{
  "totalExpense": 50000.00,
  "currency": "PHP",
  "distribution": [
    { "category": "Food & Drinks", "amount": 15000.00, "percentage": 30.0 },
    { "category": "Transportation", "amount": 10000.00, "percentage": 20.0 }
  ]
}
```

---

## Implementation Steps

### Step 1: Add Datastore Index
Add to `index.yaml`:
```yaml
- kind: transactions
  properties:
    - name: owner
    - name: type
    - name: category
    - name: date
```

### Step 2: Add Repository Method
Add to `TransactionRepository.java`:
```java
@Query("SELECT SUM(amount) FROM transactions WHERE owner = @owner AND type = @type AND category = @category AND date >= @startDate AND date <= @endDate")
Double sumAmountByOwnerAndTypeAndCategoryAndDateBetween(
    @Param("owner") String owner,
    @Param("type") TransactionType type,
    @Param("category") String category,
    @Param("startDate") Instant startDate,
    @Param("endDate") Instant endDate
);
```

### Step 3: Backend DTOs
Create `ExpenseDistributionItem.java`:
- Fields: `category` (String), `amount` (double), `percentage` (double)

Create `ExpenseDistributionResponse.java`:
- Fields: `totalExpense` (double), `currency` (String), `distribution` (List<ExpenseDistributionItem>)

### Step 4: Add Application Properties
Add expense categories to `application.yaml`:
```yaml
app:
  expense-categories:
    - Allowance
    - Food & Drinks
    - Groceries
    - Health & Medical
    - Holidays & Events
    - Housing
    - Life & Entertainment
    - Others
    - Pets, animals
    - Shopping
    - Sports & Fitness
    - Technology & Communication
    - Transportation
```

### Step 5: Create Configuration Properties Class
Create `ExpenseConfigProperties.java`:
```java
@Configuration
@ConfigurationProperties(prefix = "app")
@Data
public class ExpenseConfigProperties {
    private List<String> expenseCategories = new ArrayList<>();
}
```

### Step 6: Backend Service (Optimized)
Create `ExpenseDistributionService.java`:

```java
@Service
@RequiredArgsConstructor
public class ExpenseDistributionService {
    private final TransactionRepository transactionRepository;
    private final ExpenseConfigProperties expenseConfig;

    public ExpenseDistributionResponse getExpenseDistribution(
            String owner, List<String> accounts, TrendPeriod period) {

        Instant endDate = DateTimeUtils.endOfTodayUtc();
        Instant startDate = calculateStartDate(period);

        // Run parallel SUM queries for each category (from application properties)
        List<CompletableFuture<ExpenseDistributionItem>> futures = expenseConfig.getExpenseCategories().stream()
            .map(category -> CompletableFuture.supplyAsync(() -> {
                Double sum = transactionRepository.sumAmountByOwnerAndTypeAndCategoryAndDateBetween(
                    owner, TransactionType.EXPENSE, category, startDate, endDate
                );
                return new ExpenseDistributionItem(category, sum != null ? sum : 0.0, 0.0);
            }))
            .toList();

        // Wait for all queries and collect results
        List<ExpenseDistributionItem> items = futures.stream()
            .map(CompletableFuture::join)
            .filter(item -> item.getAmount() > 0) // Only include categories with expenses
            .toList();

        // Calculate total and percentages
        double totalExpense = items.stream().mapToDouble(ExpenseDistributionItem::getAmount).sum();

        List<ExpenseDistributionItem> distribution = items.stream()
            .map(item -> ExpenseDistributionItem.builder()
                .category(item.getCategory())
                .amount(item.getAmount())
                .percentage(totalExpense > 0 ? (item.getAmount() / totalExpense) * 100 : 0)
                .build())
            .sorted(Comparator.comparingDouble(ExpenseDistributionItem::getAmount).reversed())
            .toList();

        return ExpenseDistributionResponse.builder()
            .totalExpense(totalExpense)
            .currency("PHP") // Default currency
            .distribution(distribution)
            .build();
    }
}
```

**Note on Account Filtering**: If account filtering is required, we have two options:
1. Add `account` to the composite index and run queries per category per account (N × M queries)
2. Fall back to projection query fetching `category, amount, account` and filter in-memory

For simplicity, initial implementation can skip account filtering for this widget, or use the projection approach when accounts are specified.

### Step 7: Backend Controller
Create `ExpenseDistributionController.java`:
- `GET /api/expense-distribution`
- Accept query params: owner, accounts, period
- Return `ExpenseDistributionResponse`

### Step 8: Frontend Types
Create `expenseDistribution.ts`:
- Re-export `TrendPeriod` from balanceTrend.ts
- Define `ExpenseDistributionItem`, `ExpenseDistributionResponse`, `GetExpenseDistributionParams`

### Step 9: Frontend Service
Create `expenseDistribution.service.ts`:
- `getExpenseDistribution(params)` - calls `/api/expense-distribution`

### Step 10: Frontend Hook
Create `useExpenseDistribution.ts`:
- Uses `useQuery` from @tanstack/react-query
- Query key: `['expense-distribution', params]`
- 10 minute stale time

### Step 11: Widget Component
Create `ExpenseDistributionWidget.tsx`:
- Follow BalanceTrendWidget pattern exactly
- Use `PieChart` from react-native-gifted-charts with `donut` prop
- State: `selectedPeriod`, `menuVisible`, `focusedIndex`
- Period selector via Menu (same as BalanceTrendWidget)
- Colors from `customColors.iconForegrounds` in theme.ts
- Center label shows focused category details (tooltip)
- Legend below chart with category, amount, percentage

### Step 12: Dashboard Integration
Modify `dashboard.tsx`:
- Import `ExpenseDistributionWidget`
- Add below `BalanceTrendWidget`

---

## Performance Comparison

| Approach | Read Operations | Pros | Cons |
|----------|-----------------|------|------|
| Fetch all entities | O(N) entity reads | Simple code | Expensive for large datasets |
| Parallel SUM per category | 13 aggregation queries | Uses indexes only, parallel | Needs composite index |
| Projection query | O(N) but 2 fields only | Simpler than parallel, supports filtering | Still O(N) operations |

**Recommendation**: Use parallel SUM queries (13 concurrent) for best performance. This leverages Datastore's native aggregation and reads only index entries.

---

## Key Implementation Details

### Pie Chart Configuration
```tsx
<PieChart
  data={pieData}
  donut
  radius={100}
  innerRadius={60}
  focusOnPress
  centerLabelComponent={() => <TooltipContent />}
/>
```

### Category Colors (from theme.ts)
```ts
const getCategoryColor = (category: string): string => {
  const colorMap = {
    [Category.FOOD_DRINKS]: customColors.iconForegrounds.orange,
    [Category.HOUSING]: customColors.iconForegrounds.blue,
    // ... map all categories
  };
  return colorMap[category] || customColors.iconForegrounds.gray;
};
```

### Widget Structure
```
Card
├── Header (Title + Menu dropdown)
├── Period Label
├── Total Expense Amount
├── PieChart (donut with center tooltip)
├── Divider
└── Legend (list of categories with colors)
```

---

## Reference Files
- Widget pattern: `frontend/components/BalanceTrendWidget.tsx`
- Hook pattern: `frontend/hooks/useBalanceTrend.ts`
- Service pattern: `frontend/services/balanceTrend.service.ts`
- Backend service: `backend/src/main/java/com/lazyspender/backend/service/BalanceTrendService.java`
- Category colors: `frontend/config/theme.ts` (customColors.iconForegrounds)
- Categories enum: `frontend/types/category.ts`

---

## Sources
- [Datastore Aggregation Queries](https://docs.cloud.google.com/datastore/docs/aggregation-queries)
- [GQL Reference](https://docs.cloud.google.com/datastore/docs/reference/gql_reference)
