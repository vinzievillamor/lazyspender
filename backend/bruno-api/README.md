# LazySpender API - Bruno Collection

This is a Bruno API collection for testing the LazySpender backend API endpoints.

## Getting Started

1. Install [Bruno](https://www.usebruno.com/) if you haven't already
2. Open Bruno and import this collection by selecting the `bruno-api` folder
3. Select the `local` environment from the environment dropdown

## Environment Variables

The `local` environment includes:
- `baseUrl`: http://localhost:8080
- `owner`: testuser
- `transactionId`: replace-with-actual-id
- `plannedPaymentId`: replace-with-actual-id

**Note:** IDs are automatically extracted from responses and stored in environment variables. No manual copying needed!

## Automatic ID Extraction

The collection includes **post-response scripts** that automatically extract and store IDs:

- **Create requests** (POST): Extracts the `id` from the response and stores it in the environment
- **Get by ID requests** (GET): Updates the stored ID with the retrieved value
- **List requests** (GET with pagination/filtering): Stores the ID of the first item in the results

This means you can:
1. Run "Create Transaction" → `transactionId` is automatically set
2. Run "Get Transaction by ID" → Uses the stored `transactionId`
3. Run "Update Transaction" → Uses the stored `transactionId`
4. Run "Delete Transaction" → Uses the stored `transactionId`

Check the Bruno console for confirmation messages when IDs are stored.

## Collections

### Transactions (`/transactions`)
- **Create Transaction**: POST to create a new transaction (expense or income)
- **Get Transaction by ID**: GET to retrieve a specific transaction
- **Get All Transactions**: GET to list all transactions with pagination
- **Get Transactions by Owner**: GET to list all transactions for an owner with pagination
- **Update Transaction**: PUT to update an existing transaction
- **Delete Transaction**: DELETE to remove a transaction

### Planned Payments (`/planned-payments`)
- **Create Planned Payment**: POST to create a new recurring payment
- **Get Planned Payment by ID**: GET to retrieve a specific payment
- **Get Planned Payments by Owner**: GET to list all payments for an owner (with optional status filter)
- **Update Planned Payment**: PUT to update an existing payment
- **Delete Planned Payment**: DELETE to remove a payment

## Request Details

Each `.bru` file represents one endpoint and includes:
- Sample request body with realistic data
- Documentation explaining the endpoint and parameters
- Query parameters where applicable

You can customize the request body for each test case as needed.

## Payment Status Values
- `ACTIVE` - Payment is active and will process
- `PAUSED` - Payment is temporarily paused
- `COMPLETED` - Payment has finished (end date reached or occurrences completed)
- `CANCELLED` - Payment was manually cancelled

## Recurrence Types
- `DAILY` - Repeats every N days (recurrenceValue = "1", "2", etc.)
- `WEEKLY` - Repeats on specific day (recurrenceValue = "MONDAY", "TUESDAY", etc.)
- `MONTHLY` - Repeats on day of month (recurrenceValue = "1" to "31")
- `YEARLY` - Repeats every N years (recurrenceValue = "1", "2", etc.)

## End Types
- `NEVER` - No end date (endValue = null)
- `DATE` - Ends on specific date (endValue = ISO date string)
- `OCCURRENCE` - Ends after N occurrences (endValue = number as string)

## Confirmation Types
- `MANUAL` - Requires manual confirmation before creating transaction
- `AUTO` - Automatically creates transaction when due
