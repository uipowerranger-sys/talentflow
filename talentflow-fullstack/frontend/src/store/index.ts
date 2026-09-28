import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
type AuthState = { authenticated: boolean; name: string };
const authSlice = createSlice({
  name: 'auth',
  initialState: { authenticated: Boolean(sessionStorage.getItem('talentflow-token')), name: sessionStorage.getItem('talentflow-name') || 'Candidate' } as AuthState,
  reducers: {
    signIn(state, action: PayloadAction<{ name: string; token: string }>) { state.authenticated = true; state.name = action.payload.name; sessionStorage.setItem('talentflow-token', action.payload.token); sessionStorage.setItem('talentflow-name', action.payload.name); },
    signOut(state) { state.authenticated = false; state.name = 'Candidate'; sessionStorage.removeItem('talentflow-token'); sessionStorage.removeItem('talentflow-name'); },
  },
});
export const { signIn, signOut } = authSlice.actions;
export const store = configureStore({ reducer: { auth: authSlice.reducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
