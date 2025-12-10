import React from 'react';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Category } from '../types/category';

export const getCategoryIcon = (category: string, size: number = 24) => {
  const iconMap: Record<string, JSX.Element> = {
    [Category.ACTIVE_SPORT_FITNESS]: <MaterialIcons name="sports-soccer" size={size} color="#ef4444" />,
    [Category.ALLOWANCE]: <MaterialIcons name="attach-money" size={size} color="#10b981" />,
    [Category.BAR_CAFE]: <Ionicons name="cafe" size={size} color="#8b4513" />,
    [Category.CHARGES_FEES]: <MaterialIcons name="receipt" size={size} color="#6b7280" />,
    [Category.CINEMA]: <MaterialIcons name="movie" size={size} color="#ec4899" />,
    [Category.CLOTHES_SHOES]: <MaterialIcons name="shopping-bag" size={size} color="#a855f7" />,
    [Category.COMMUNICATION_PC]: <MaterialIcons name="computer" size={size} color="#3b82f6" />,
    [Category.DRUGSTORE_CHEMIST]: <FontAwesome5 name="pills" size={size - 4} color="#ef4444" />,
    [Category.ELECTRONICS_ACCESSORIES]: <MaterialIcons name="devices" size={size} color="#3b82f6" />,
    [Category.FINANCIAL_EXPENSES]: <MaterialIcons name="account-balance" size={size} color="#6b7280" />,
    [Category.FOOD_DRINKS]: <MaterialIcons name="restaurant" size={size} color="#f59e0b" />,
    [Category.FUEL]: <MaterialIcons name="local-gas-station" size={size} color="#ef4444" />,
    [Category.GIFTS_JOY]: <MaterialIcons name="card-giftcard" size={size} color="#ec4899" />,
    [Category.GROCERIES]: <MaterialIcons name="shopping-cart" size={size} color="#10b981" />,
    [Category.HEALTH_BEAUTY]: <MaterialIcons name="spa" size={size} color="#ec4899" />,
    [Category.HEALTH_CARE_DOCTOR]: <MaterialIcons name="local-hospital" size={size} color="#ef4444" />,
    [Category.HOBBIES]: <MaterialIcons name="palette" size={size} color="#8b5cf6" />,
    [Category.HOLIDAY_TRIPS_HOTELS]: <FontAwesome5 name="plane" size={size - 4} color="#ec4899" />,
    [Category.HOME_GARDEN]: <MaterialIcons name="home" size={size} color="#10b981" />,
    [Category.HOUSING]: <MaterialIcons name="house" size={size} color="#6b7280" />,
    [Category.INCOME]: <MaterialIcons name="attach-money" size={size} color="#10b981" />,
    [Category.INTERNET]: <MaterialIcons name="wifi" size={size} color="#3b82f6" />,
    [Category.LENDING_RENTING]: <MaterialIcons name="handshake" size={size} color="#6b7280" />,
    [Category.LIFE_ENTERTAINMENT]: <MaterialIcons name="theaters" size={size} color="#ec4899" />,
    [Category.LIFE_EVENTS]: <MaterialIcons name="celebration" size={size} color="#f59e0b" />,
    [Category.OTHERS]: <MaterialIcons name="more-horiz" size={size} color="#6b7280" />,
    [Category.PARKING]: <MaterialIcons name="local-parking" size={size} color="#8b5cf6" />,
    [Category.PETS_ANIMALS]: <MaterialIcons name="pets" size={size} color="#f59e0b" />,
    [Category.PHONE_CELL_PHONE]: <MaterialIcons name="phone" size={size} color="#3b82f6" />,
    [Category.PUBLIC_TRANSPORT]: <MaterialIcons name="directions-bus" size={size} color="#6366f1" />,
    [Category.REFUNDS]: <MaterialIcons name="money-off" size={size} color="#10b981" />,
    [Category.RESTAURANT_FAST_FOOD]: <MaterialIcons name="restaurant" size={size} color="#f59e0b" />,
    [Category.SHOPPING]: <MaterialIcons name="shopping-bag" size={size} color="#a855f7" />,
    [Category.SOFTWARE_APPS_GAMES]: <MaterialIcons name="computer" size={size} color="#3b82f6" />,
    [Category.SPORTS_ACTIVE]: <MaterialIcons name="sports-soccer" size={size} color="#ef4444" />,
    [Category.TV_STREAMING]: <MaterialIcons name="tv" size={size} color="#8b5cf6" />,
    [Category.TAXI]: <MaterialIcons name="local-taxi" size={size} color="#f59e0b" />,
    [Category.TOLL]: <MaterialIcons name="toll" size={size} color="#6b7280" />,
    [Category.TRANSPORTATION]: <MaterialIcons name="directions-car" size={size} color="#6366f1" />,
    [Category.VEHICLE]: <MaterialIcons name="directions-car" size={size} color="#6366f1" />,
    [Category.VEHICLE_INSURANCE]: <MaterialIcons name="security" size={size} color="#6b7280" />,
    [Category.VEHICLE_MAINTENANCE]: <MaterialIcons name="build" size={size} color="#f59e0b" />,
    [Category.WELLNESS_BEAUTY]: <MaterialIcons name="spa" size={size} color="#ec4899" />,
  };

  return iconMap[category] || <MaterialIcons name="payment" size={size} color="#6b7280" />;
};
