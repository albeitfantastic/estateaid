// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house': 'home',
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // EstateAid icons
  'building.2.fill': 'villa',
  'person.fill': 'account-circle',
  'person.badge.plus': 'person-add',
  'person.2.fill': 'group',
  'calendar': 'calendar-today',
  'calendar.badge.plus': 'event-available',
  'calendar.badge.clock': 'event',
  'calendar.badge.exclamationmark': 'event-busy',
  'info.circle.fill': 'info',
  'tray.fill': 'inbox',
  'envelope': 'mail',
  'envelope.fill': 'mail',
  'doc.fill': 'description',
  'phone.fill': 'phone',
  'exclamationmark.triangle.fill': 'warning',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle.fill': 'cancel',
  'questionmark.circle.fill': 'help',
  'lock.doc.fill': 'lock',
  'bubble.left.fill': 'chat-bubble',
  'arrow.triangle.2.circlepath': 'sync',
  'star.fill': 'star',
  'slider.horizontal.3': 'tune',
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'pencil': 'edit',
  'trash': 'delete',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'checkmark': 'check',
  'xmark': 'close',
  'ellipsis': 'more-horiz',
  'magnifyingglass': 'search',
  'bell.fill': 'notifications',
  'gearshape.fill': 'settings',
  'photo': 'photo',
  'doc.badge.plus': 'note-add',
  'tag.fill': 'label',
  'clock.fill': 'schedule',
  'map.fill': 'map',
  'globe': 'language',
  'suitcase': 'luggage',
  'suitcase.fill': 'luggage',
  'line.3.horizontal': 'menu',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.down': 'keyboard-arrow-down',
  'arrow.down.circle.fill': 'arrow-circle-down',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'sun.max.fill': 'wb-sunny',
  'moon.fill': 'dark-mode',
  'doc.text.fill': 'article',
  'rectangle.portrait.and.arrow.right': 'logout',
  'creditcard.fill': 'credit-card',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight: _weight,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
