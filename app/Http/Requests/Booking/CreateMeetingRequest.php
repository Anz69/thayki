<?php

declare(strict_types=1);

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class CreateMeetingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            // Model profile must be a *published* model — silent IDOR check.
            'model_profile_id' => ['required', 'integer', 'exists:model_profiles,id'],
            'scheduled_at'     => ['required', 'date', 'after:+15 minutes'],
            'duration_hours'   => ['required', 'integer', 'min:1', 'max:24'],
            // `price_thb` is intentionally NOT accepted from the client — the
            // server derives it from the model's hourly rate.
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'scheduled_at.after'    => 'Время встречи должно быть не менее чем через 15 минут от текущего момента.',
            'duration_hours.max'    => 'Максимальная длительность бронирования — 24 часа.',
            'duration_hours.min'    => 'Минимальная длительность бронирования — 1 час.',
        ];
    }
}
