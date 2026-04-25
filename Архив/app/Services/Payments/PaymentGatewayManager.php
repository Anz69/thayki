<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Services\Payments\Contracts\PaymentGateway;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Contracts\Container\Container;
use RuntimeException;

/**
 * Resolves the active PaymentGateway implementation from config.
 */
class PaymentGatewayManager
{
    public function __construct(
        private readonly Container $container,
        private readonly ConfigRepository $config,
    ) {}

    public function default(): PaymentGateway
    {
        $alias = (string) $this->config->get('payments.gateway', 'manual');

        return $this->driver($alias);
    }

    public function driver(string $alias): PaymentGateway
    {
        /** @var array<string, class-string<PaymentGateway>> $map */
        $map = (array) $this->config->get('payments.gateways', []);

        if (! isset($map[$alias])) {
            throw new RuntimeException("Unknown payment gateway [{$alias}].");
        }

        /** @var PaymentGateway $instance */
        $instance = $this->container->make($map[$alias]);

        return $instance;
    }
}
