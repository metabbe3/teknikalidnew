import { authService } from "@/domains/auth/auth.service";

export const getCurrentUser = () => authService.getCurrentUser();
export const requireAuth = () => authService.requireAuth();
export const requireAdmin = () => authService.requireAdmin();
