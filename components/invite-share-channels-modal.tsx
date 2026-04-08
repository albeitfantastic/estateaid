import { Ionicons } from '@expo/vector-icons';
import { Linking, Modal, Pressable, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { APP_STORE_URL } from '@/lib/invite-messages';

type Props = {
  visible: boolean;
  onClose: () => void;
  shareBody: string;
  waBody: string;
  emailSubject: string;
  shareTitle: string;
};

export function InviteShareChannelsModal({
  visible,
  onClose,
  shareBody,
  waBody,
  emailSubject,
  shareTitle,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  function openEmail() {
    const url = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(shareBody)}`;
    void Linking.openURL(url);
  }

  function openSms() {
    void Linking.openURL(`sms:?body=${encodeURIComponent(shareBody)}`);
  }

  function openWhatsApp() {
    void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(waBody)}`);
  }

  function openTelegram() {
    void Linking.openURL(
      `https://t.me/share/url?url=${encodeURIComponent(APP_STORE_URL)}&text=${encodeURIComponent(shareBody)}`
    );
  }

  async function openNativeShare() {
    await Share.share({ message: shareBody, title: shareTitle });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
            {t('ownerInvite.shareTitle')}
          </ThemedText>
          <ThemedText style={[styles.cardSub, { color: colors.icon }]}>{t('ownerInvite.shareSub')}</ThemedText>

          <View style={styles.grid}>
            <TouchableOpacity
              style={[styles.cell, { backgroundColor: colors.tint + '12' }]}
              onPress={openEmail}
              activeOpacity={0.8}
            >
              <IconSymbol name="envelope.fill" size={26} color={colors.tint} />
              <ThemedText style={[styles.cellLabel, { color: colors.text }]}>{t('ownerInvite.channelEmail')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cell, { backgroundColor: colors.tint + '12' }]}
              onPress={openSms}
              activeOpacity={0.8}
            >
              <IconSymbol name="phone.fill" size={26} color={colors.tint} />
              <ThemedText style={[styles.cellLabel, { color: colors.text }]}>{t('ownerInvite.channelSms')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cell, { backgroundColor: '#25D36618' }]}
              onPress={openWhatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
              <ThemedText style={[styles.cellLabel, { color: colors.text }]}>
                {t('ownerInvite.channelWhatsapp')}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cell, { backgroundColor: '#0088CC18' }]}
              onPress={openTelegram}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={26} color="#0088CC" />
              <ThemedText style={[styles.cellLabel, { color: colors.text }]}>
                {t('ownerInvite.channelTelegram')}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cell, { backgroundColor: colors.tint + '12' }]}
              onPress={() => void openNativeShare()}
              activeOpacity={0.8}
            >
              <IconSymbol name="square.and.arrow.up" size={26} color={colors.tint} />
              <ThemedText style={[styles.cellLabel, { color: colors.text }]}>
                {t('ownerInvite.channelMessenger')}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText style={[styles.messengerHint, { color: colors.icon }]}>
            {t('ownerInvite.messengerHint')}
          </ThemedText>

          <TouchableOpacity onPress={onClose} style={[styles.doneBtn, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.doneBtnText}>{t('ownerInvite.done')}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  cardTitle: { fontSize: 18, textAlign: 'center' },
  cardSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  cell: {
    width: '30%',
    minWidth: 92,
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  cellLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  messengerHint: { fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 4 },
  doneBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
