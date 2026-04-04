export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export const testUser: TestUser = {
  id: "123456789",
  name: "nishan",
  email: "dreamgf691@gmail.com",
  role: "ADMIN",
  phone: "+12025550123",
  avatarUrl: "https://example.com/avatar.png",
  isActive: true,
};
