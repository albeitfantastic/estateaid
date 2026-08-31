import { Ionicons } from '@expo/vector-icons';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { openInviteShareChannel } from '@/lib/invite-share-channels';
import { inviteHttpsLink } from '@/lib/invite-messages';

export type InviteSharePreviewItem = {
  estateName: string;
  inviteCode: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  shareBody: string;
  /** Compact body for WhatsApp, SMS, Telegram, system share (note + code + one link). */
  messengerBody: string;
  emailSubject: string;
  shareTitle: string;
  /** Shown above channel picker so note and code are visible before sending. */
  previewNote?: string;
  previewItems?: InviteSharePreviewItem[];
};

export function InviteShareChannelsModal({
  visible,
  onClose,
  shareBody,
  messengerBody,
  emailSubject,
  shareTitle,
  previewNote,
  previewItems = [],
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  function openEmail() {
    const url = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(shareBody)}`;
    void Linking.openURL(url);
  }

  async function openSms() {
    await openInviteShareChannel('sms', messengerBody, shareTitle);
  }

  async function openWhatsApp() {
    await openInviteShareChannel('whatsapp', messengerBody, shareTitle);
  }

  async function openTelegram() {
    await openInviteShareChannel('telegram', messengerBody, shareTitle);
  }

  async function openNativeShare() {
    await Share.share({ message: messengerBody, title: shareTitle });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '33' }]}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {shareTitle}
            </ThemedText>
            <ThemedText style={[styles.cardSub, { color: colors.icon }]}>{t('ownerInvite.shareSub')}</ThemedText>

            {(previewNote?.trim() || previewItems.length > 0) && (
              <View style={[styles.preview, { borderColor: colors.icon + '28', backgroundColor: colors.tint + '08' }]}>
                {previewNote?.trim() ? (
                  <View style={styles.previewBlock}>
                    <ThemedText style={[styles.previewLabel, { color: colors.icon }]}>
                      {t('ownerInvite.sharePreviewNote')}
                    </ThemedText>
                    <ThemedText style={styles.previewNoteText}>{previewNote.trim()}</ThemedText>
                  </View>
                ) : null}
                {previewItems.map((item) => (
                  <View key={item.inviteCode} style={styles.previewBlock}>
                    {previewItems.length > 1 ? (
                      <ThemedText type="defaultSemiBold" style={styles.previewEstate}>
                        {item.estateName}
                      </ThemedText>
                    ) : null}
                    <ThemedText style={[styles.previewLabel, { color: colors.icon }]}>
                      {t('ownerInvite.sharePreviewLink')}
                    </ThemedText>
                    <ThemedText style={[styles.previewLink, { color: colors.tint }]} selectable>
                      {inviteHttpsLink(item.inviteCode)}
                    </ThemedText>
                    <ThemedText style={[styles.previewLabel, { color: colors.icon }]}>
                      {t('ownerInvite.sharePreviewCode')}
                    </ThemedText>
                    <ThemedText style={[styles.previewCode, { color: colors.tint }]} selectable>
                      {item.inviteCode}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

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
              onPress={() => void openSms()}
              activeOpacity={0.8}
            >
              <IconSymbol name="phone.fill" size={26} color={colors.tint} />
              <ThemedText style={[styles.cellLabel, { color: colors.text }]}>{t('ownerInvite.channelSms')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cell, { backgroundColor: '#25D36618' }]}
              onPress={() => void openWhatsApp()}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
              <ThemedText style={[styles.cellLabel, { color: colors.text }]}>
                {t('ownerInvite.channelWhatsapp')}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cell, { backgroundColor: '#0088CC18' }]}
              onPress={() => void openTelegram()}
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
          </ScrollView>
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
    maxHeight: '85%',
  },
  cardScroll: {
    padding: 20,
    gap: 12,
  },
  cardTitle: { fontSize: 18, textAlign: 'center' },
  cardSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  preview: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  previewBlock: { gap: 6 },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  previewNoteText: { fontSize: 15, lineHeight: 21 },
  previewEstate: { fontSize: 14, marginBottom: 2 },
  previewLink: { fontSize: 13, lineHeight: 18 },
  previewCode: { fontSize: 26, fontWeight: '800', letterSpacing: 4 },
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
