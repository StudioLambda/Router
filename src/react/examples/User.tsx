import { useParams } from 'router/react:hooks/useParams'

/**
 * Example route component for the `/user/:id` path.
 * Demonstrates reading dynamic route parameters via the
 * `useParams` hook and rendering them in the UI.
 */
export default function User() {
  const { id } = useParams()

  return <div>User ID: {id}</div>
}
