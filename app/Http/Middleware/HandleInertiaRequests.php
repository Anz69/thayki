<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{

    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {

        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'         => $user->id,
                    'first_name' => $user->first_name,
                    'last_name'  => $user->last_name,
                    'username'   => $user->username,
                    'photo_url'  => $user->photo_url,
                    'role'       => $user->role->value,
                    'is_premium' => $user->is_premium,
                    'is_strange' => (bool) $user->is_strange,
                ] : null,
            ],
            'flash' => [
                'message' => session('message'),
            ],

            'appEnv' => app()->environment(),
        ];
    }
}
