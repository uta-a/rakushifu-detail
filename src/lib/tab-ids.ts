/** tab と tabpanel の id を対応させるためのヘルパー */
export const tabId = (prefix: string, value: string) => `${prefix}-tab-${value}`;
export const panelId = (prefix: string, value: string) => `${prefix}-panel-${value}`;
