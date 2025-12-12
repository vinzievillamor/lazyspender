import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { JSX } from 'react';
import { Category } from '../types/category';
import { customColors } from '../config/theme';

export const getCategoryIcon = (category: string, size: number = 24) => {
  const iconMap: Record<string, JSX.Element> = {
    [Category.ALLOWANCE]: <MaterialIcons name="attach-money" size={size} color={customColors.iconForegrounds.green} />,
    [Category.FOOD_DRINKS]: <MaterialIcons name="restaurant" size={size} color={customColors.iconForegrounds.orange} />,
    [Category.GROCERIES]: <MaterialIcons name="shopping-cart" size={size} color={customColors.iconForegrounds.teal} />,
    [Category.HEALTH_MEDICAL]: <MaterialIcons name="local-hospital" size={size} color={customColors.iconForegrounds.pink} />,
    [Category.HOLIDAYS_EVENTS]: <MaterialIcons name="celebration" size={size} color={customColors.iconForegrounds.purple} />,
    [Category.HOUSING]: <MaterialIcons name="house" size={size} color={customColors.iconForegrounds.blue} />,
    [Category.INCOME]: <MaterialIcons name="attach-money" size={size} color={customColors.income} />,
    [Category.LIFE_ENTERTAINMENT]: <MaterialIcons name="theaters" size={size} color={customColors.iconForegrounds.purple} />,
    [Category.OTHERS]: <MaterialIcons name="more-horiz" size={size} color={customColors.iconForegrounds.gray} />,
    [Category.PETS_ANIMALS]: <MaterialIcons name="pets" size={size} color={customColors.iconForegrounds.yellow} />,
    [Category.SHOPPING]: <MaterialIcons name="shopping-bag" size={size} color={customColors.iconForegrounds.pink} />,
    [Category.SPORTS_FITNESS]: <MaterialIcons name="sports-soccer" size={size} color={customColors.iconForegrounds.green} />,
    [Category.TECHNOLOGY_COMMUNICATION]: <MaterialIcons name="computer" size={size} color={customColors.iconForegrounds.blue} />,
    [Category.TRANSPORTATION]: <MaterialIcons name="directions-car" size={size} color={customColors.iconForegrounds.teal} />,
  };

  return iconMap[category] || <MaterialIcons name="payment" size={size} color={customColors.iconForegrounds.gray} />;
};
