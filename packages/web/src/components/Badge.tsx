type BadgeProps = {
  label: string
  variant: 'annual' | 'quarterly' | 'interim' | 'final'
}

export function Badge({ label, variant }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{label}</span>
}
