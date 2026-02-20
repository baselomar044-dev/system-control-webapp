import asyncio
from typing import Any

from langchain.tools import tool

from services import system_monitor, process_manager, command_executor, file_manager, screenshot as screenshot_service


@tool
def get_cpu_usage() -> str:
    """Get current CPU usage percentage and core information."""
    loop = asyncio.new_event_loop()
    result = loop.run_until_complete(system_monitor.get_cpu_info())
    loop.close()
    return (
        f"CPU Usage: {result['percent']}% | "
        f"Logical Cores: {result['count_logical']} | "
        f"Physical Cores: {result['count_physical']} | "
        f"Frequency: {result['frequency_mhz']} MHz"
    )


@tool
def get_memory_info() -> str:
    """Get current memory (RAM) usage information."""
    loop = asyncio.new_event_loop()
    result = loop.run_until_complete(system_monitor.get_memory_info())
    loop.close()
    total_gb = result["total"] / (1024 ** 3)
    used_gb = result["used"] / (1024 ** 3)
    avail_gb = result["available"] / (1024 ** 3)
    return (
        f"RAM: {used_gb:.2f}GB used / {total_gb:.2f}GB total ({result['percent']}% used) | "
        f"Available: {avail_gb:.2f}GB | "
        f"Swap: {result['swap_percent']}% used"
    )


@tool
def get_disk_info() -> str:
    """Get disk usage information for all mounted partitions."""
    loop = asyncio.new_event_loop()
    result = loop.run_until_complete(system_monitor.get_disk_info())
    loop.close()
    parts = []
    for disk in result:
        total_gb = disk["total"] / (1024 ** 3)
        used_gb = disk["used"] / (1024 ** 3)
        parts.append(f"{disk['mountpoint']}: {used_gb:.1f}GB/{total_gb:.1f}GB ({disk['percent']}%)")
    return " | ".join(parts) if parts else "No disk information available"


@tool
def list_processes(sort_by: str = "cpu_percent", limit: int = 20) -> str:
    """List running system processes sorted by a given field (cpu_percent, memory_percent, pid, name)."""
    procs = process_manager.list_processes(sort_by=sort_by, limit=limit)
    lines = [f"{'PID':>7} {'CPU%':>6} {'MEM%':>6} {'STATUS':<10} {'NAME'}", "-" * 55]
    for p in procs:
        lines.append(
            f"{p.get('pid', 0):>7} {p.get('cpu_percent', 0.0):>6.1f} "
            f"{p.get('memory_percent', 0.0):>6.2f} {p.get('status', ''):<10} {p.get('name', '')}"
        )
    return "\n".join(lines)


@tool
def kill_process(pid: int) -> str:
    """Terminate a process by its PID."""
    try:
        result = process_manager.kill_process(int(pid))
        return f"Process {result['pid']} ({result['name']}) terminated successfully."
    except (ProcessLookupError, PermissionError) as e:
        return f"Failed to kill process {pid}: {e}"


@tool
def execute_command(command: str) -> str:
    """Execute a shell command and return its output. Dangerous commands are blocked."""
    loop = asyncio.new_event_loop()
    result = loop.run_until_complete(command_executor.execute_command(command, timeout=15))
    loop.close()
    if result.get("blocked"):
        return f"Command blocked for safety: {result['stderr']}"
    output = result["stdout"] or result["stderr"] or "(no output)"
    return f"Exit code {result['return_code']}:\n{output[:2000]}"


@tool
def list_files(path: str = "/") -> str:
    """List files and directories at the given path."""
    try:
        result = file_manager.list_directory(path)
        lines = [f"Directory: {result['path']} ({result['total']} items)"]
        for entry in result["entries"][:50]:
            kind = "DIR " if entry["is_dir"] else "FILE"
            size = f"{entry['size']:>10}" if entry["size"] is not None else f"{'':>10}"
            lines.append(f"  [{kind}] {size}  {entry['name']}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error listing files: {e}"


@tool
def read_file_content(path: str) -> str:
    """Read the contents of a text file."""
    try:
        result = file_manager.read_file(path, max_size_bytes=1024 * 1024)
        content = result.get("content", "")
        if len(content) > 3000:
            content = content[:3000] + "\n...(truncated)"
        return f"File: {path}\n---\n{content}"
    except Exception as e:
        return f"Error reading file: {e}"


@tool
def search_files_tool(base_path: str, query: str) -> str:
    """Search for files by name in a directory."""
    try:
        results = file_manager.search_files(base_path, query, max_results=20)
        if not results:
            return f"No files matching '{query}' found in {base_path}"
        lines = [f"Found {len(results)} file(s) matching '{query}':"]
        for r in results:
            lines.append(f"  {r['path']} ({r['size']} bytes)")
        return "\n".join(lines)
    except Exception as e:
        return f"Error searching files: {e}"


@tool
def take_screenshot() -> str:
    """Take a screenshot of the current screen. Returns a description of the result."""
    result = screenshot_service.take_screenshot(save_to_disk=True)
    if result["success"]:
        return f"Screenshot taken successfully. Saved to: {result['path']} ({result['width']}x{result['height']})"
    return f"Screenshot failed: {result.get('error', 'Unknown error')}"


@tool
def get_system_summary() -> str:
    """Get a comprehensive summary of the system: CPU, memory, disk, and network."""
    loop = asyncio.new_event_loop()
    result = loop.run_until_complete(system_monitor.get_system_summary())
    loop.close()
    cpu = result["cpu"]
    mem = result["memory"]
    disks = result["disk"]
    disk_str = "; ".join(
        f"{d['mountpoint']} {d['percent']}%" for d in disks[:3]
    )
    return (
        f"CPU: {cpu['percent']}% | "
        f"RAM: {mem['percent']}% used ({mem['used'] // (1024**2)}MB / {mem['total'] // (1024**2)}MB) | "
        f"Disk: {disk_str}"
    )


ALL_TOOLS = [
    get_cpu_usage,
    get_memory_info,
    get_disk_info,
    list_processes,
    kill_process,
    execute_command,
    list_files,
    read_file_content,
    search_files_tool,
    take_screenshot,
    get_system_summary,
]
