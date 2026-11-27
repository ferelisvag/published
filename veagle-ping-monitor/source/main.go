// VEAGLE Ping Monitor: ένα αρχείο .exe. Ακούει ΜΟΝΟ στον ίδιο υπολογιστή (127.0.0.1).
package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"regexp"
	"sync"
	"time"
)

//go:embed web
var web embed.FS

var hostRe = regexp.MustCompile(`^[\p{L}\p{N}_][\p{L}\p{N}_.\-]{0,252}$`)

type result struct {
	Host   string `json:"host"`
	OK     bool   `json:"ok"`
	Ms     *int   `json:"ms"`
	IP     string `json:"ip"`
	Status string `json:"status"`
}

func resolve(host string) (net.IP, error) {
	if ip := net.ParseIP(host); ip != nil {
		if v4 := ip.To4(); v4 != nil {
			return v4, nil
		}
		return nil, fmt.Errorf("μόνο IPv4")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip4", host)
	if err != nil || len(ips) == 0 {
		return nil, fmt.Errorf("δεν βρέθηκε")
	}
	return ips[0].To4(), nil
}

func ping(host string, timeout int) result {
	r := result{Host: host, Status: "Error"}
	if !hostRe.MatchString(host) {
		return r
	}
	ip, err := resolve(host)
	if err != nil {
		r.Status = "NotFound"
		return r
	}
	ms, ok, err := icmpEcho(ip, timeout)
	switch {
	case err != nil:
	case !ok:
		r.Status = "TimedOut"
	default:
		r.OK, r.Ms, r.IP, r.Status = true, &ms, ip.String(), "Success"
	}
	return r
}

func newHandler(token, addr string, quit func()) http.Handler {
	send := func(w http.ResponseWriter, code int, v any) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(v)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, _ *http.Request) {
		page, _ := web.ReadFile("web/index.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(bytes.Replace(page, []byte("__TOKEN__"), []byte(token), 1))
	})
	for _, name := range []string{"eagle.png", "icon.png"} {
		data, _ := web.ReadFile("web/" + name)
		mux.HandleFunc("GET /"+name, func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "image/png")
			w.Write(data)
		})
	}
	api := func(pattern string, h http.HandlerFunc) {
		mux.HandleFunc(pattern, func(w http.ResponseWriter, q *http.Request) {
			if subtle.ConstantTimeCompare([]byte(q.Header.Get("X-Veagle-Token")), []byte(token)) != 1 {
				send(w, 403, map[string]string{"error": "token"})
				return
			}
			h(w, q)
		})
	}
	api("GET /api/info", func(w http.ResponseWriter, _ *http.Request) {
		send(w, 200, map[string]string{"gateway": gateway()})
	})
	api("POST /api/ping", func(w http.ResponseWriter, q *http.Request) {
		var in struct {
			Hosts   []string `json:"hosts"`
			Timeout int      `json:"timeout"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, q.Body, 4000)).Decode(&in); err != nil || len(in.Hosts) > 6 {
			send(w, 400, map[string]string{"error": "request"})
			return
		}
		timeout := min(5000, max(300, in.Timeout))
		out := make([]result, len(in.Hosts))
		var wg sync.WaitGroup
		for i, h := range in.Hosts {
			wg.Add(1)
			go func() {
				defer wg.Done()
				out[i] = ping(h, timeout)
			}()
		}
		wg.Wait()
		send(w, 200, map[string]any{"results": out})
	})
	api("POST /api/quit", func(w http.ResponseWriter, _ *http.Request) {
		send(w, 200, map[string]bool{"ok": true})
		quit()
	})
	return http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		// Μόνο αιτήσεις προς τη δική μας τοπική διεύθυνση (προστασία από DNS rebinding).
		if q.Host != addr {
			w.WriteHeader(403)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Frame-Options", "DENY")
		mux.ServeHTTP(w, q)
	})
}

func main() {
	setupConsole()
	var ln net.Listener
	for port := 8765; port < 8775; port++ {
		l, err := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", port))
		if err == nil {
			ln = l
			break
		}
	}
	if ln == nil {
		fmt.Println("Δεν βρέθηκε ελεύθερη θύρα (8765-8774). Πάτα Enter για κλείσιμο.")
		bufio.NewReader(os.Stdin).ReadString('\n')
		os.Exit(1)
	}
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		panic(err)
	}
	addr := ln.Addr().String()
	srv := &http.Server{ReadHeaderTimeout: 5 * time.Second}
	done := make(chan struct{})
	var once sync.Once
	srv.Handler = newHandler(hex.EncodeToString(raw), addr, func() { once.Do(func() { close(done) }) })
	url := "http://" + addr + "/"
	fmt.Print("\n  VEAGLE Ping Monitor λειτουργεί.\n")
	fmt.Println("  Διεύθυνση: " + url)
	fmt.Println("  ΜΗΝ κλείσεις αυτό το παράθυρο όσο χρησιμοποιείς την εφαρμογή.")
	fmt.Println("  Για τερματισμό: κλείσε το παράθυρο ή πάτα «Τερματισμός» στην εφαρμογή.")
	go srv.Serve(ln)
	if len(os.Args) < 2 || os.Args[1] != "--no-browser" {
		openBrowser(url)
	}
	<-done
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}
