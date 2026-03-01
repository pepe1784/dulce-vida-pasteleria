// Auth models - not used for admin (custom auth), kept for session store compatibility.
export type UpsertUser = {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
};

export type User = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

// Customer profile returned by Google OAuth
export type CustomerProfile = {
  googleId: string;
  email: string;
  name: string;
  picture?: string | null;
  phone?: string | null;
  preferredAddress?: string | null; // JSON string of address object
};
