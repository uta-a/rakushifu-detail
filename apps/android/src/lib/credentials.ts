import * as SecureStore from 'expo-secure-store';

// 従業員IDとパスワードは Android Keystore で暗号化して端末内だけに保存する。
// AsyncStorage やログには書かないこと。
const EMPLOYEE_CODE_KEY = 'rakushifu.employeeCode';
const PASSWORD_KEY = 'rakushifu.password';

export interface Credentials {
  employeeCode: string;
  password: string;
}

export async function loadCredentials(): Promise<Credentials | null> {
  const [employeeCode, password] = await Promise.all([
    SecureStore.getItemAsync(EMPLOYEE_CODE_KEY),
    SecureStore.getItemAsync(PASSWORD_KEY),
  ]);
  return employeeCode && password ? { employeeCode, password } : null;
}

export async function saveCredentials({ employeeCode, password }: Credentials): Promise<void> {
  await SecureStore.setItemAsync(EMPLOYEE_CODE_KEY, employeeCode);
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
}

export async function clearCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(EMPLOYEE_CODE_KEY),
    SecureStore.deleteItemAsync(PASSWORD_KEY),
  ]);
}
