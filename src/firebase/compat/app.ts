export interface FirebaseApp {
  name: string;
  options: any;
}

const mockApp: FirebaseApp = {
  name: '[Mock] AdPulse Supabase App',
  options: {},
};

export function initializeApp(options: any): FirebaseApp {
  return mockApp;
}

export function getApps(): FirebaseApp[] {
  return [mockApp];
}

export function getApp(): FirebaseApp {
  return mockApp;
}
