# --- PowerShell Static Web Server ---
$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

$basePath = "C:\Users\dasqo\.gemini\antigravity\scratch\wfh-student-tracker"

Write-Output "=========================================================="
Write-Output " Starting WFH Time Tracker Local Web Server"
Write-Output " URL: http://localhost:$port/"
Write-Output " Press Ctrl+C in terminal to stop the server"
Write-Output "=========================================================="

try {
    $listener.Start()
    Write-Output "Server is running and listening on port $port..."
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        # Clean path to prevent path traversal
        $localPath = $localPath.Replace("/", "\").TrimStart("\")
        $filePath = Join-Path $basePath $localPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "text/html; charset=utf-8"
            
            if ($extension -eq ".css") { 
                $contentType = "text/css" 
            } elseif ($extension -eq ".js") { 
                $contentType = "application/javascript" 
            } elseif ($extension -eq ".json") { 
                $contentType = "application/json" 
            } elseif ($extension -eq ".png") {
                $contentType = "image/png"
            } elseif ($extension -eq ".jpg" -or $extension -eq ".jpeg") {
                $contentType = "image/jpeg"
            }
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            
            Write-Output "$(Get-Date -Format 'HH:mm:ss') - 200 OK - $localPath"
        } else {
            $response.StatusCode = 404
            $errorMessage = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $errorMessage.Length
            $response.OutputStream.Write($errorMessage, 0, $errorMessage.Length)
            
            Write-Output "$(Get-Date -Format 'HH:mm:ss') - 404 Not Found - $localPath"
        }
        $response.Close()
    }
} catch {
    Write-Output "Server encountered an error: $_"
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
    Write-Output "Server has stopped."
}
