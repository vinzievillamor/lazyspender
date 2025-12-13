import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { JSX } from 'react';
import { Category } from '../types/category';
import { customColors } from '../config/theme';

export const getCategoryIcon = (category: string, size: number = 24) => {
  const iconMap: Record<string, JSX.Element> = {
    [Category.ALLOWANCE]: <Ionicons name="cash-outline" size={size} color={customColors.iconForegrounds.green} />,
    [Category.FOOD_DRINKS]: <Ionicons name="restaurant-outline" size={size} color={customColors.iconForegrounds.orange} />,
    [Category.GROCERIES]: <Ionicons name="cart-outline" size={size} color={customColors.iconForegrounds.teal} />,
    [Category.HEALTH_MEDICAL]: <Ionicons name="medical-outline" size={size} color={customColors.iconForegrounds.pink} />,
    [Category.HOLIDAYS_EVENTS]: <Ionicons name="balloon-outline" size={size} color={customColors.iconForegrounds.purple} />,
    [Category.HOUSING]: <Ionicons name="home-outline" size={size} color={customColors.iconForegrounds.blue} />,
    [Category.INCOME]: <Ionicons name="trending-up-outline" size={size} color={customColors.income} />,
    [Category.LIFE_ENTERTAINMENT]: <Ionicons name="film-outline" size={size} color={customColors.iconForegrounds.purple} />,
    [Category.OTHERS]: <Ionicons name="ellipsis-horizontal-outline" size={size} color={customColors.iconForegrounds.gray} />,
    [Category.PETS_ANIMALS]: <Ionicons name="paw-outline" size={size} color={customColors.iconForegrounds.yellow} />,
    [Category.SHOPPING]: <Ionicons name="bag-outline" size={size} color={customColors.iconForegrounds.pink} />,
    [Category.SPORTS_FITNESS]: <Ionicons name="fitness-outline" size={size} color={customColors.iconForegrounds.green} />,
    [Category.TECHNOLOGY_COMMUNICATION]: <Ionicons name="laptop-outline" size={size} color={customColors.iconForegrounds.blue} />,
    [Category.TRANSPORTATION]: <Ionicons name="car-outline" size={size} color={customColors.iconForegrounds.teal} />,
  };

  return iconMap[category] || <Ionicons name="card-outline" size={size} color={customColors.iconForegrounds.gray} />;
};
