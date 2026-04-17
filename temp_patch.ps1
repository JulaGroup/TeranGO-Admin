
$content = Get-Content "c:\Users\DELL\Desktop\terango main files\complete admin panel\src\components\vendor\vendor-sidebar.tsx" -Raw
$content = $content -replace "// DollarSign,", "DollarSign,"
$content = $content | Set-Content "c:\Users\DELL\Desktop\terango main files\complete admin panel\src\components\vendor\vendor-sidebar.tsx"

