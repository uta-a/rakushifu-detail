import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, View } from 'react-native';
import { useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';
import { Text } from './text';

/**
 * 中央に出すダイアログ。背景（overlay）のタップと戻る操作で onClose を呼ぶ。
 * 面は Card と同じ border + rounded-lg（影なし）。ボタンは footer に並べる。
 */
export function Dialog({ open, onClose, title, description, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        <Pressable
          accessibilityLabel="閉じる"
          onPress={onClose}
          style={{ flex: 1, justifyContent: 'center', padding: space[4], backgroundColor: colors.overlay }}
        >
          {/* 中身のタップで閉じないよう、ここで受け止める */}
          <Pressable
            accessible={false}
            onPress={() => {}}
            style={{
              gap: space[4],
              padding: space[6],
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              backgroundColor: colors.popover,
            }}
          >
            <View style={{ gap: space[2] }}>
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
              {description ? <Text tone="muted">{description}</Text> : null}
            </View>
            {children}
            {footer ? (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] }}>{footer}</View>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
