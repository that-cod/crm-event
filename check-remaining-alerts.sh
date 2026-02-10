#!/bin/bash
# Script to batch-update remaining alert() calls to useToast()

files=(
  "app/dashboard/challans/[id]/print/page.tsx"
  "app/dashboard/bundle-templates/new/page.tsx"
  "app/dashboard/scrap/[id]/dispose/page.tsx"
  "app/dashboard/scrap/new/page.tsx"
  "app/dashboard/repairs/[id]/complete/page.tsx"
  "app/dashboard/repairs/[id]/update/page.tsx"
  "app/dashboard/repairs/new/page.tsx"
  "app/dashboard/attendance-management/upload/page.tsx"
  "app/dashboard/sites/new/page.tsx"
  "app/dashboard/projects/new/page.tsx"
  "app/dashboard/purchase-orders/new/page.tsx"
  "app/dashboard/purchase-orders/[id]/receive/page.tsx"
  "app/dashboard/stock-movements/manual/page.tsx"
  # ... add more as needed
)

echo "Files with remaining alerts:"
for file in "${files[@]}"; do
  count=$(grep -c "alert(" "$file" 2>/dev/null || echo "0")
  if [ "$count" -gt "0" ]; then
    echo "  $file: $count alerts"
  fi
done

echo ""
echo "Total alerts remaining:"
grep -r "alert(" app/dashboard --include="*.tsx" | wc -l
