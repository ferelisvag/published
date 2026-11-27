package main

import (
	"encoding/binary"
	"errors"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"syscall"
	"unsafe"
)

var (
	kernel32       = syscall.NewLazyDLL("kernel32.dll")
	setOutputCP    = kernel32.NewProc("SetConsoleOutputCP")
	setTitle       = kernel32.NewProc("SetConsoleTitleW")
	loadLibraryEx  = kernel32.NewProc("LoadLibraryExW")
	system32       = filepath.Join(os.Getenv("SystemRoot"), "System32")
	icmpCreateFile uintptr
	icmpClose      uintptr
	icmpSend       uintptr
)

// Το iphlpapi.dll φορτώνεται ΜΟΝΟ από το System32 των Windows.
func init() {
	const searchSystem32 = 0x00000800
	name, _ := syscall.UTF16PtrFromString("iphlpapi.dll")
	h, _, _ := loadLibraryEx.Call(uintptr(unsafe.Pointer(name)), 0, searchSystem32)
	if h == 0 {
		return
	}
	icmpCreateFile, _ = syscall.GetProcAddress(syscall.Handle(h), "IcmpCreateFile")
	icmpClose, _ = syscall.GetProcAddress(syscall.Handle(h), "IcmpCloseHandle")
	icmpSend, _ = syscall.GetProcAddress(syscall.Handle(h), "IcmpSendEcho")
}

// icmpEcho στέλνει ένα ping με τη λειτουργία των Windows (δεν χρειάζεται διαχειριστής).
func icmpEcho(ip net.IP, timeoutMs int) (ms int, ok bool, err error) {
	if icmpCreateFile == 0 || icmpClose == 0 || icmpSend == 0 {
		return 0, false, errors.New("iphlpapi")
	}
	h, _, _ := syscall.SyscallN(icmpCreateFile)
	if h == ^uintptr(0) {
		return 0, false, errors.New("IcmpCreateFile")
	}
	defer syscall.SyscallN(icmpClose, h)
	data := []byte("VEAGLE-Ping-Monitor-0123456789ab") // 32 bytes, όπως το ping των Windows
	reply := make([]uint64, 64)                        // 512 bytes, ευθυγραμμισμένα
	addr := binary.LittleEndian.Uint32(ip.To4())
	n, _, _ := syscall.SyscallN(icmpSend, h, uintptr(addr),
		uintptr(unsafe.Pointer(&data[0])), uintptr(len(data)), 0,
		uintptr(unsafe.Pointer(&reply[0])), uintptr(len(reply)*8), uintptr(timeoutMs))
	if n == 0 {
		return 0, false, nil
	}
	// ICMP_ECHO_REPLY: Address (4), Status (4), RoundTripTime (4)
	status := uint32(reply[0] >> 32)
	if status != 0 {
		return 0, false, nil
	}
	return int(uint32(reply[1])), true, nil
}

var routeRe = regexp.MustCompile(`(?m)^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)`)

// gateway: η διεύθυνση του router, μόνο για να προταθεί στη λίστα.
func gateway() string {
	cmd := exec.Command(filepath.Join(system32, "route.exe"), "print", "-4", "0.0.0.0")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.Output()
	if err != nil {
		return ""
	}
	if m := routeRe.FindSubmatch(out); m != nil {
		return string(m[1])
	}
	return ""
}

func setupConsole() {
	setOutputCP.Call(65001)
	t, _ := syscall.UTF16PtrFromString("VEAGLE Ping Monitor")
	setTitle.Call(uintptr(unsafe.Pointer(t)))
}

func openBrowser(url string) {
	exec.Command(filepath.Join(system32, "rundll32.exe"), "url.dll,FileProtocolHandler", url).Start()
}
