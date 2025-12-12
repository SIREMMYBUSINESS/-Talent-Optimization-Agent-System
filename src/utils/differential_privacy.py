"""
Differential Privacy Engine for Resume Screening

Implements privacy-preserving mechanisms (Laplace, Gaussian) to add calibrated noise
to candidate screening scores. Supports DP parameter configuration, epsilon budget tracking,
and privacy metadata generation for audit logging.
"""

import math
import random
from dataclasses import dataclass
from typing import Optional, Tuple
from enum import Enum


class PrivacyMechanism(Enum):
    """Supported differential privacy mechanisms."""
    LAPLACE = "laplace"
    GAUSSIAN = "gaussian"


@dataclass
class PrivacyParameters:
    """Configuration for differential privacy application."""
    epsilon: float = 1.0
    delta: float = 1e-5
    mechanism: PrivacyMechanism = PrivacyMechanism.LAPLACE
    sensitivity: float = 100.0

    def validate(self) -> None:
        """Validate privacy parameters."""
        if self.epsilon <= 0:
            raise ValueError(f"epsilon must be positive, got {self.epsilon}")
        if self.delta < 0 or self.delta > 1:
            raise ValueError(f"delta must be in [0, 1], got {self.delta}")
        if self.sensitivity <= 0:
            raise ValueError(f"sensitivity must be positive, got {self.sensitivity}")


@dataclass
class PrivacyResult:
    """Result of applying differential privacy."""
    original_score: float
    private_score: float
    noise_amount: float
    epsilon: float
    delta: float
    mechanism: str
    lower_bound: float
    upper_bound: float
    confidence_interval_width: float


class DifferentialPrivacy:
    """Core differential privacy implementation."""

    @staticmethod
    def _laplace_noise(scale: float) -> float:
        """Generate Laplace-distributed noise with given scale.

        Laplace(scale) has mean 0 and variance 2*scale^2.
        Uses inverse transform sampling for numerical stability.
        """
        u = random.random()
        if u < 0.5:
            return scale * math.log(2 * u)
        else:
            return -scale * math.log(2 * (1 - u))

    @staticmethod
    def _gaussian_noise(sigma: float) -> float:
        """Generate Gaussian-distributed noise with given sigma.

        Gaussian noise provides different privacy-utility tradeoff
        than Laplace, with heavier tail and better tail bounds.
        """
        return random.gauss(0, sigma)

    @classmethod
    def apply_laplace_mechanism(
        cls,
        original_score: float,
        epsilon: float,
        sensitivity: float = 100.0,
        score_min: float = 0.0,
        score_max: float = 100.0,
    ) -> PrivacyResult:
        """Apply Laplace mechanism for differential privacy.

        Args:
            original_score: Raw candidate score (0-100)
            epsilon: Privacy budget (smaller = more private but noisier)
            sensitivity: Max absolute change in score (default 100 for 0-100 scale)
            score_min: Minimum valid score
            score_max: Maximum valid score

        Returns:
            PrivacyResult with noisy score and privacy metadata
        """
        scale = sensitivity / epsilon
        noise = cls._laplace_noise(scale)
        private_score = original_score + noise

        # Clamp to valid range
        private_score = max(score_min, min(score_max, private_score))
        noise_amount = private_score - original_score

        # Compute confidence interval (95% for Laplace)
        ci_width = 1.96 * scale
        lower_bound = max(score_min, original_score - ci_width)
        upper_bound = min(score_max, original_score + ci_width)

        return PrivacyResult(
            original_score=original_score,
            private_score=private_score,
            noise_amount=noise_amount,
            epsilon=epsilon,
            delta=0.0,
            mechanism="laplace",
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            confidence_interval_width=ci_width,
        )

    @classmethod
    def apply_gaussian_mechanism(
        cls,
        original_score: float,
        epsilon: float,
        delta: float = 1e-5,
        sensitivity: float = 100.0,
        score_min: float = 0.0,
        score_max: float = 100.0,
    ) -> PrivacyResult:
        """Apply Gaussian mechanism for differential privacy.

        Gaussian mechanism provides (epsilon, delta)-differential privacy.
        Better utility-privacy tradeoff for small epsilon.

        Args:
            original_score: Raw candidate score (0-100)
            epsilon: Privacy budget
            delta: Failure probability (typically 1e-5 to 1e-7)
            sensitivity: Max absolute change in score
            score_min: Minimum valid score
            score_max: Maximum valid score

        Returns:
            PrivacyResult with noisy score and privacy metadata
        """
        if delta <= 0 or delta >= 1:
            raise ValueError(f"delta must be in (0, 1), got {delta}")

        # Gaussian scale from Dwork & Roth
        # sigma = sqrt(2 * ln(1.25 / delta)) * sensitivity / epsilon
        sigma = math.sqrt(2 * math.log(1.25 / delta)) * sensitivity / epsilon
        noise = cls._gaussian_noise(sigma)
        private_score = original_score + noise

        # Clamp to valid range
        private_score = max(score_min, min(score_max, private_score))
        noise_amount = private_score - original_score

        # 95% confidence interval for Gaussian
        ci_width = 1.96 * sigma
        lower_bound = max(score_min, original_score - ci_width)
        upper_bound = min(score_max, original_score + ci_width)

        return PrivacyResult(
            original_score=original_score,
            private_score=private_score,
            noise_amount=noise_amount,
            epsilon=epsilon,
            delta=delta,
            mechanism="gaussian",
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            confidence_interval_width=ci_width,
        )

    @classmethod
    def apply_privacy(
        cls,
        original_score: float,
        params: PrivacyParameters,
        score_min: float = 0.0,
        score_max: float = 100.0,
    ) -> PrivacyResult:
        """Apply differential privacy using configured mechanism.

        Args:
            original_score: Raw score to privatize
            params: PrivacyParameters configuration
            score_min: Minimum valid score
            score_max: Maximum valid score

        Returns:
            PrivacyResult with private score and metadata
        """
        params.validate()

        if params.mechanism == PrivacyMechanism.LAPLACE:
            return cls.apply_laplace_mechanism(
                original_score=original_score,
                epsilon=params.epsilon,
                sensitivity=params.sensitivity,
                score_min=score_min,
                score_max=score_max,
            )
        elif params.mechanism == PrivacyMechanism.GAUSSIAN:
            return cls.apply_gaussian_mechanism(
                original_score=original_score,
                epsilon=params.epsilon,
                delta=params.delta,
                sensitivity=params.sensitivity,
                score_min=score_min,
                score_max=score_max,
            )
        else:
            raise ValueError(f"Unknown mechanism: {params.mechanism}")


class PrivacyBudgetTracker:
    """Track epsilon budget consumption across screening sessions."""

    def __init__(self, initial_budget: float = 10.0):
        """Initialize budget tracker.

        Args:
            initial_budget: Total epsilon budget available
        """
        self.initial_budget = initial_budget
        self.consumed = 0.0

    @property
    def remaining(self) -> float:
        """Get remaining epsilon budget."""
        return max(0.0, self.initial_budget - self.consumed)

    @property
    def percent_used(self) -> float:
        """Get percentage of budget consumed."""
        if self.initial_budget == 0:
            return 0.0
        return (self.consumed / self.initial_budget) * 100

    def consume(self, epsilon: float) -> bool:
        """Consume epsilon budget.

        Args:
            epsilon: Amount to consume

        Returns:
            True if budget available, False if would exceed budget
        """
        if self.consumed + epsilon > self.initial_budget:
            return False
        self.consumed += epsilon
        return True

    def can_afford(self, epsilon: float) -> bool:
        """Check if epsilon budget available without consuming."""
        return self.consumed + epsilon <= self.initial_budget
