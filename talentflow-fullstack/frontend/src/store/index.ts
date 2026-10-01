import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
export type UserRole = 'employee' | 'hr' | 'admin';
type AuthState = { authenticated: boolean; name: string; role: UserRole };
const authSlice = createSlice({
  name: 'auth',
  initialState: { authenticated: Boolean(sessionStorage.getItem('talentflow-token')), name: sessionStorage.getItem('talentflow-name') || 'Employee', role: (sessionStorage.getItem('talentflow-role') || 'employee') as UserRole } as AuthState,
  reducers: {
    signIn(state, action: PayloadAction<{ name: string; token: string; role: UserRole }>) { state.authenticated = true; state.name = action.payload.name; state.role = action.payload.role; sessionStorage.setItem('talentflow-token', action.payload.token); sessionStorage.setItem('talentflow-name', action.payload.name); sessionStorage.setItem('talentflow-role', action.payload.role); },
    signOut(state) { state.authenticated = false; state.name = 'Employee'; state.role = 'employee'; sessionStorage.removeItem('talentflow-token'); sessionStorage.removeItem('talentflow-name'); sessionStorage.removeItem('talentflow-role'); },
  },
});
export const { signIn, signOut } = authSlice.actions;
export const store = configureStore({ reducer: { auth: authSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
