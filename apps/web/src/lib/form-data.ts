export function toFormData(fields: Record<string, string | number>, image: File | null): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.append(key, String(value))
  if (image) formData.append('image', image)
  return formData
}
