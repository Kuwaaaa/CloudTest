export const adminFetchHeaders = (): Record<string, string> => {
  const adminToken = process.env.NEXT_PUBLIC_CLOUDTEST_ADMIN_TOKEN?.trim();
  return adminToken ? { "x-admin-token": adminToken } : {};
};
