<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\MeetingStatus;
use App\Models\Meeting;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MeetingStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public readonly Meeting $meeting,
        public readonly MeetingStatus $previousStatus,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('meeting.'.$this->meeting->id),
            new PrivateChannel('users.'.$this->meeting->client_id),
            new PrivateChannel('model-profiles.'.$this->meeting->model_profile_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'meeting.status_changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'meeting_id' => $this->meeting->id,
            'status' => $this->meeting->status->value,
            'previous_status' => $this->previousStatus->value,
        ];
    }
}
