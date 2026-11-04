import { View } from 'react-native';
import { Construction } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** 雛形の段階で中身が未実装の画面。空状態と同じ型（アイコン + 1行の説明）で出す */
export function ComingSoon({ description }: { description: string }) {
  const { colors } = useTheme();
  return (
    <Card>
      <CardContent>
        <View style={{ minHeight: 128, alignItems: 'center', justifyContent: 'center', gap: space[2] }}>
          <Construction size={24} color={colors.mutedForeground} />
          <Text tone="muted">{description}</Text>
        </View>
      </CardContent>
    </Card>
  );
}
