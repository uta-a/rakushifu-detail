import { useState } from 'react';
import { View } from 'react-native';
import type { SalarySettings } from '@rakushifu/core';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { formatYen } from '@/lib/format';
import { space } from '@/theme/tokens';

/** 空文字・負値・NaN を 0 に丸める */
function toAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 給与設定のボタンと現在値。編集はダイアログで行い、保存を押したときだけ反映する */
export function SalarySettingsBar({ settings, onSave }: {
  settings: SalarySettings;
  onSave: (settings: SalarySettings) => void;
}) {
  const [open, setOpen] = useState(false);
  // 入力途中の空欄を許すため、編集中は文字列で持つ
  const [hourlyRate, setHourlyRate] = useState('');
  const [transportCost, setTransportCost] = useState('');

  const openDialog = () => {
    setHourlyRate(String(settings.hourlyRate));
    setTransportCost(String(settings.transportCost));
    setOpen(true);
  };

  const handleSave = () => {
    onSave({ hourlyRate: toAmount(hourlyRate), transportCost: toAmount(transportCost) });
    setOpen(false);
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[3], rowGap: space[2] }}>
      <Button variant="outline" dense onPress={openDialog}>
        給与設定
      </Button>
      <Text variant="caption" tabular>
        {`時給 ${formatYen(settings.hourlyRate)}円 ・ 交通費 ${formatYen(settings.transportCost)}円/日`}
      </Text>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="給与設定"
        footer={
          <>
            <Button variant="outline" onPress={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onPress={handleSave}>保存</Button>
          </>
        }
      >
        <View style={{ gap: space[4] }}>
          <Input
            label="時給（円）"
            keyboardType="number-pad"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            style={{ fontVariant: ['tabular-nums'] }}
          />
          <Input
            label="交通費（円/日）"
            keyboardType="number-pad"
            value={transportCost}
            onChangeText={setTransportCost}
            style={{ fontVariant: ['tabular-nums'] }}
          />
        </View>
      </Dialog>
    </View>
  );
}
