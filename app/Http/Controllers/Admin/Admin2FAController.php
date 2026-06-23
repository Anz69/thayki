<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Services\Admin\AdminTwoFactor;
use App\Support\IpGeo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class Admin2FAController extends Controller
{
    public function __construct(private readonly AdminTwoFactor $twoFactor) {}

    public function setup(Request $request): View|RedirectResponse
    {
        $admin = Auth::guard('admin')->user();
        if (! $admin instanceof AdminUser) {
            return redirect($this->panelUrl());
        }
        if ($admin->tg_chat_id) {
            return redirect()->route('admin.2fa.show');
        }

        $bot = trim((string) config('telegram.bot_username'));
        $link = null;
        if ($bot !== '') {
            $token = $this->twoFactor->createLinkToken($admin);
            $link = "https://t.me/{$bot}?start=adminlink-{$token}";
        }

        return view('admin.twofactor-setup', ['link' => $link, 'botConfigured' => $bot !== '']);
    }

    public function status(Request $request): \Illuminate\Http\JsonResponse
    {
        $admin = Auth::guard('admin')->user();

        return response()->json([
            'linked' => $admin instanceof AdminUser && (bool) $admin->tg_chat_id,
        ]);
    }

    public function show(Request $request): View|RedirectResponse
    {
        $admin = Auth::guard('admin')->user();
        if (! $admin instanceof AdminUser) {
            return redirect($this->panelUrl());
        }
        if (! $admin->tg_chat_id) {
            return redirect()->route('admin.2fa.setup');
        }
        if ($this->alreadyTrusted($request)) {
            return redirect($this->panelUrl());
        }

        // Auto-send a code on first view (throttled so a refresh doesn't spam).
        $lastSent = (int) $request->session()->get('admin_2fa_sent_at', 0);
        if ($lastSent === 0 || (now()->timestamp - $lastSent) > 30) {
            $this->twoFactor->sendCode($admin, IpGeo::clientIp($request));
            $request->session()->put('admin_2fa_sent_at', now()->timestamp);
        }

        return view('admin.twofactor');
    }

    public function verify(Request $request): RedirectResponse
    {
        $admin = Auth::guard('admin')->user();
        if (! $admin instanceof AdminUser || ! $admin->tg_chat_id) {
            return redirect($this->panelUrl());
        }

        $data = $request->validate(['code' => ['required', 'string', 'max:10']]);

        if ($this->twoFactor->verify($admin, $data['code'])) {
            $request->session()->put('admin_2fa_verified_at', now()->timestamp);
            $request->session()->forget('admin_2fa_sent_at');

            return redirect($this->panelUrl());
        }

        return back()->withErrors(['code' => 'Неверный или просроченный код.']);
    }

    public function resend(Request $request): RedirectResponse
    {
        $admin = Auth::guard('admin')->user();
        if ($admin instanceof AdminUser && $admin->tg_chat_id) {
            $lastSent = (int) $request->session()->get('admin_2fa_sent_at', 0);
            if ($lastSent === 0 || (now()->timestamp - $lastSent) > 30) {
                $this->twoFactor->sendCode($admin, IpGeo::clientIp($request));
                $request->session()->put('admin_2fa_sent_at', now()->timestamp);

                return back()->with('status', 'Новый код отправлен в Telegram.');
            }

            return back()->with('status', 'Код уже отправлен — подождите немного.');
        }

        return redirect($this->panelUrl());
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $login = \Illuminate\Support\Facades\Route::has('filament.admin.auth.login')
            ? route('filament.admin.auth.login')
            : $this->panelUrl();

        return redirect()->to($login);
    }

    private function alreadyTrusted(Request $request): bool
    {
        $verifiedAt = (int) $request->session()->get('admin_2fa_verified_at', 0);
        $trustTtl = (int) config('admin.twofactor.trust_ttl', 43200);

        return $verifiedAt > 0 && (now()->timestamp - $verifiedAt) < $trustTtl;
    }

    private function panelUrl(): string
    {
        return url('/'.ltrim((string) config('admin.path', 'admin'), '/'));
    }
}
