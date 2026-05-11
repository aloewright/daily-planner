import { useQuery } from '@tanstack/react-query'

export function useTask(id: string | null) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/tasks/${id}`)
      if (!res.ok) throw new Error('Failed to fetch task')
      return res.json()
    },
    enabled: !!id,
  })
}
