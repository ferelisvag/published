//go:build !windows

// Μόνο για δοκιμή της οθόνης σε άλλο σύστημα: ΠΡΟΣΟΜΟΙΩΜΕΝΑ ping. Δεν μπαίνει στο .exe.
package main

import (
	"math/rand/v2"
	"net"
	"time"
)

func icmpEcho(ip net.IP, timeoutMs int) (int, bool, error) {
	if ip[0] == 10 || rand.IntN(30) == 0 {
		time.Sleep(time.Duration(timeoutMs) * time.Millisecond / 3)
		return 0, false, nil
	}
	return 8 + int(ip[3])%50 + rand.IntN(9), true, nil
}
func gateway() string    { return "192.168.1.1" }
func setupConsole()      {}
func openBrowser(string) {}
