<?php

declare(strict_types=1);

namespace App\Events;

use App\Enums\LeadStatus;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public readonly int $chatId, public readonly string $status) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('chats.'.$this->chatId)];
    }

    public function broadcastAs(): string
    {
        return 'lead.status';
    }

    public function broadcastWith(): array
    {
        return [
            'status' => $this->status,
            'closed' => in_array($this->status, [LeadStatus::Closed->value, LeadStatus::Completed->value], true),
        ];
    }
}
