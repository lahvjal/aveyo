interface AuthHeaderOptions {
  required?: boolean;
}

export async function createAuthHeaders(
  initialHeaders: HeadersInit = {},
  options: AuthHeaderOptions = {}
) {
  const headers = new Headers(initialHeaders);
  void options;

  return headers;
}
