import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { JSX } from 'react';
import { Category } from '../types/category';
import { customColors } from '../config/theme';

export const getCategoryIcon = (category: string, size: number = 24) => {
  const iconMap: Record<string, JSX.Element> = {
    [Category.ALLOWANCE]: <Ionicons name="cash-outline" size={size} color={customColors.iconForegrounds.green} />,
    [Category.CAR_LOAN]: <Ionicons name="receipt-outline" size={size} color={customColors.iconForegrounds.purple} />,
    [Category.CAR_MAINTENANCE]: <Ionicons name="construct-outline" size={size} color={customColors.iconForegrounds.teal} />,
    [Category.FOOD_DRINKS]: <Ionicons name="restaurant-outline" size={size} color={customColors.iconForegrounds.orange} />,
    [Category.FUEL]: <Ionicons name="flame-outline" size={size} color={customColors.iconForegrounds.amber} />,
    [Category.GROCERIES]: <Ionicons name="cart-outline" size={size} color={customColors.iconForegrounds.cyan} />,
    [Category.HEALTH_MEDICAL]: <Ionicons name="medical-outline" size={size} color={customColors.iconForegrounds.pink} />,
    [Category.HOLIDAYS_EVENTS]: <Ionicons name="balloon-outline" size={size} color={customColors.iconForegrounds.purple} />,
    [Category.HOUSING]: <Ionicons name="home-outline" size={size} color={customColors.iconForegrounds.blue} />,
    [Category.INCIDENT_EMERGENCIES]: <Ionicons name="warning-outline" size={size} color={customColors.iconForegrounds.pink} />,
    [Category.INCOME]: <Ionicons name="trending-up-outline" size={size} color={customColors.income} />,
    [Category.LIFE_ENTERTAINMENT]: <Ionicons name="film-outline" size={size} color={customColors.iconForegrounds.magenta} />,
    [Category.OTHERS]: <Ionicons name="ellipsis-horizontal-outline" size={size} color={customColors.iconForegrounds.gray} />,
    [Category.PARKING]: <Ionicons name="car-outline" size={size} color={customColors.iconForegrounds.deepOrange} />,
    [Category.PETS_ANIMALS]: <Ionicons name="paw-outline" size={size} color={customColors.iconForegrounds.yellow} />,
    [Category.RIDE_HAILING]: <Ionicons name="car-sport-outline" size={size} color={customColors.iconForegrounds.indigo} />,
    [Category.SHOPPING]: <Ionicons name="bag-outline" size={size} color={customColors.iconForegrounds.pink} />,
    [Category.SPORTS_FITNESS]: <Ionicons name="fitness-outline" size={size} color={customColors.iconForegrounds.green} />,
    [Category.TECHNOLOGY_COMMUNICATION]: <Ionicons name="laptop-outline" size={size} color={customColors.iconForegrounds.blue} />,
    [Category.TOLL]: <Ionicons name="card-outline" size={size} color={customColors.iconForegrounds.lightGreen} />,
  };

  return iconMap[category] || <Ionicons name="card-outline" size={size} color={customColors.iconForegrounds.gray} />;
};
