import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { JSX } from 'react';
import { Category } from '../types/category';

export const getCategoryIcon = (category: string, size: number = 24) => {
  const iconMap: Record<string, JSX.Element> = {
    [Category.ALLOWANCE]: <MaterialIcons name="attach-money" size={size} />,
    [Category.FOOD_DRINKS]: <MaterialIcons name="restaurant" size={size} />,
    [Category.GROCERIES]: <MaterialIcons name="shopping-cart" size={size} />,
    [Category.HEALTH_MEDICAL]: <MaterialIcons name="local-hospital" size={size} />,
    [Category.HOLIDAYS_EVENTS]: <MaterialIcons name="celebration" size={size} />,
    [Category.HOUSING]: <MaterialIcons name="house" size={size} />,
    [Category.INCOME]: <MaterialIcons name="attach-money" size={size} />,
    [Category.LIFE_ENTERTAINMENT]: <MaterialIcons name="theaters" size={size} />,
    [Category.OTHERS]: <MaterialIcons name="more-horiz" size={size} />,
    [Category.PETS_ANIMALS]: <MaterialIcons name="pets" size={size} />,
    [Category.SHOPPING]: <MaterialIcons name="shopping-bag" size={size} />,
    [Category.SPORTS_FITNESS]: <MaterialIcons name="sports-soccer" size={size} />,
    [Category.TECHNOLOGY_COMMUNICATION]: <MaterialIcons name="computer" size={size} />,
    [Category.TRANSPORTATION]: <MaterialIcons name="directions-car" size={size} />,
  };

  return iconMap[category] || <MaterialIcons name="payment" size={size} />;
};
