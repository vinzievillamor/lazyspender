import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { JSX } from 'react';
import { Category } from '../types/category';

export const getCategoryIcon = (category: string, size: number = 24) => {
  const iconMap: Record<string, JSX.Element> = {
    [Category.ACTIVE_SPORT_FITNESS]: <MaterialIcons name="sports-soccer" size={size} />,
    [Category.ALLOWANCE]: <MaterialIcons name="attach-money" size={size} />,
    [Category.BAR_CAFE]: <Ionicons name="cafe" size={size} />,
    [Category.CHARGES_FEES]: <MaterialIcons name="receipt" size={size} />,
    [Category.CINEMA]: <MaterialIcons name="movie" size={size} />,
    [Category.CLOTHES_SHOES]: <MaterialIcons name="shopping-bag" size={size} />,
    [Category.COMMUNICATION_PC]: <MaterialIcons name="computer" size={size} />,
    [Category.DRUGSTORE_CHEMIST]: <FontAwesome5 name="pills" size={size - 4} />,
    [Category.ELECTRONICS_ACCESSORIES]: <MaterialIcons name="devices" size={size} />,
    [Category.FINANCIAL_EXPENSES]: <MaterialIcons name="account-balance" size={size} />,
    [Category.FOOD_DRINKS]: <MaterialIcons name="restaurant" size={size} />,
    [Category.FUEL]: <MaterialIcons name="local-gas-station" size={size} />,
    [Category.GIFTS_JOY]: <MaterialIcons name="card-giftcard" size={size} />,
    [Category.GROCERIES]: <MaterialIcons name="shopping-cart" size={size} />,
    [Category.HEALTH_BEAUTY]: <MaterialIcons name="spa" size={size} />,
    [Category.HEALTH_CARE_DOCTOR]: <MaterialIcons name="local-hospital" size={size} />,
    [Category.HOBBIES]: <MaterialIcons name="palette" size={size} />,
    [Category.HOLIDAY_TRIPS_HOTELS]: <FontAwesome5 name="plane" size={size - 4} />,
    [Category.HOME_GARDEN]: <MaterialIcons name="home" size={size} />,
    [Category.HOUSING]: <MaterialIcons name="house" size={size} />,
    [Category.INCOME]: <MaterialIcons name="attach-money" size={size} />,
    [Category.INTERNET]: <MaterialIcons name="wifi" size={size} />,
    [Category.LENDING_RENTING]: <MaterialIcons name="handshake" size={size} />,
    [Category.LIFE_ENTERTAINMENT]: <MaterialIcons name="theaters" size={size} />,
    [Category.LIFE_EVENTS]: <MaterialIcons name="celebration" size={size} />,
    [Category.OTHERS]: <MaterialIcons name="more-horiz" size={size} />,
    [Category.PARKING]: <MaterialIcons name="local-parking" size={size} />,
    [Category.PETS_ANIMALS]: <MaterialIcons name="pets" size={size} />,
    [Category.PHONE_CELL_PHONE]: <MaterialIcons name="phone" size={size} />,
    [Category.PUBLIC_TRANSPORT]: <MaterialIcons name="directions-bus" size={size} />,
    [Category.REFUNDS]: <MaterialIcons name="money-off" size={size} />,
    [Category.RESTAURANT_FAST_FOOD]: <MaterialIcons name="restaurant" size={size} />,
    [Category.SHOPPING]: <MaterialIcons name="shopping-bag" size={size} />,
    [Category.SOFTWARE_APPS_GAMES]: <MaterialIcons name="computer" size={size} />,
    [Category.SPORTS_ACTIVE]: <MaterialIcons name="sports-soccer" size={size} />,
    [Category.TV_STREAMING]: <MaterialIcons name="tv" size={size} />,
    [Category.TAXI]: <MaterialIcons name="local-taxi" size={size} />,
    [Category.TOLL]: <MaterialIcons name="toll" size={size} />,
    [Category.TRANSPORTATION]: <MaterialIcons name="directions-car" size={size} />,
    [Category.VEHICLE]: <MaterialIcons name="directions-car" size={size} />,
    [Category.VEHICLE_INSURANCE]: <MaterialIcons name="security" size={size} />,
    [Category.VEHICLE_MAINTENANCE]: <MaterialIcons name="build" size={size} />,
    [Category.WELLNESS_BEAUTY]: <MaterialIcons name="spa" size={size} />,
  };

  return iconMap[category] || <MaterialIcons name="payment" size={size} />;
};
