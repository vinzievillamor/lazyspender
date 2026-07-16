import { Category } from '../types/category';
import { customColors } from '../config/theme';

export const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    [Category.ALLOWANCE]: customColors.iconForegrounds.green,
    [Category.CAR_LOAN]: customColors.iconForegrounds.purple,
    [Category.CAR_MAINTENANCE]: customColors.iconForegrounds.gray,
    [Category.FOOD_DRINKS]: customColors.iconForegrounds.orange,
    [Category.FUEL]: customColors.iconForegrounds.amber,
    [Category.GROCERIES]: customColors.iconForegrounds.cyan,
    [Category.HEALTH_MEDICAL]: customColors.iconForegrounds.pink,
    [Category.HOLIDAYS_EVENTS]: customColors.iconForegrounds.purple,
    [Category.HOUSING]: customColors.iconForegrounds.blue,
    [Category.INCIDENT_EMERGENCIES]: customColors.iconForegrounds.pink,
    [Category.INCOME]: customColors.iconForegrounds.lightGreen,
    [Category.LIFE_ENTERTAINMENT]: customColors.iconForegrounds.magenta,
    [Category.OTHERS]: customColors.iconForegrounds.gray,
    [Category.PARKING]: customColors.iconForegrounds.deepOrange,
    [Category.PETS_ANIMALS]: customColors.iconForegrounds.amber,
    [Category.RIDE_HAILING]: customColors.iconForegrounds.teal,
    [Category.SHOPPING]: customColors.iconForegrounds.yellow,
    [Category.SPORTS_FITNESS]: customColors.iconForegrounds.teal,
    [Category.TECHNOLOGY_COMMUNICATION]: customColors.iconForegrounds.indigo,
    [Category.TOLL]: customColors.iconForegrounds.cyan,
  };

  return colorMap[category] || customColors.iconForegrounds.gray;
};
