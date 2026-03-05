"""
Superbru submitter — superbru.com

Handles both AFL and NRL pools in a single login session.
Login: Superbru account (email/password)
Flow: Login -> Pool page -> Current round -> Click teams -> Save
"""

import os
import asyncio
from typing import Dict, List

from loguru import logger
from submitters.base_submitter import BaseSubmitter


class SuperbruSubmitter(BaseSubmitter):
    PLATFORM = "superbru"
    SPORT = "both"  # Handles AFL + NRL
    LOGIN_URL = "https://www.superbru.com/login"

    def _get_credentials(self) -> Dict[str, str]:
        return {
            "email": os.getenv("SUPERBRU_EMAIL", ""),
            "password": os.getenv("SUPERBRU_PASSWORD", ""),
            "pool_id": os.getenv("SUPERBRU_POOL_ID", ""),
        }

    async def login(self) -> bool:
        creds = self._get_credentials()
        if not creds["email"] or not creds["password"]:
            logger.error(f"[{self.PLATFORM}] Missing SUPERBRU_EMAIL or SUPERBRU_PASSWORD")
            return False

        await self.page.goto(self.LOGIN_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        try:
            # Superbru login form
            email_field = self.page.locator(
                'input[type="email"], input[name="email"], input[id="email"], '
                'input[name="username"], input[placeholder*="email" i]'
            ).first
            await email_field.fill(creds["email"])

            password_field = self.page.locator('input[type="password"]').first
            await password_field.fill(creds["password"])

            submit_btn = self.page.locator(
                'button[type="submit"], button:has-text("Log in"), '
                'button:has-text("Sign in"), input[type="submit"]'
            ).first
            await submit_btn.click()

            await self.page.wait_for_load_state("networkidle", timeout=15000)
            await asyncio.sleep(2)

            current_url = self.page.url
            if "login" in current_url.lower():
                await self.take_screenshot("login_failed")
                logger.error(f"[{self.PLATFORM}] Still on login page after submit")
                return False

            logger.info(f"[{self.PLATFORM}] Login successful")
            return True

        except Exception as e:
            await self.take_screenshot("login_error")
            logger.error(f"[{self.PLATFORM}] Login error: {e}")
            return False

    async def navigate_to_round(self) -> bool:
        """Navigate to the pool's tipping page. Superbru uses pool IDs."""
        try:
            creds = self._get_credentials()
            pool_id = creds.get("pool_id", "")

            if pool_id:
                url = f"https://www.superbru.com/pool/{pool_id}"
            else:
                url = "https://www.superbru.com/pools"

            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

            # Look for "Make Picks" or "Enter Tips" button
            pick_selectors = [
                'a:has-text("Make Picks")',
                'a:has-text("Enter Picks")',
                'a:has-text("Make Tips")',
                'button:has-text("Make Picks")',
                'a:has-text("Pick")',
            ]

            for selector in pick_selectors:
                try:
                    btn = self.page.locator(selector).first
                    if await btn.is_visible(timeout=2000):
                        await btn.click()
                        await self.page.wait_for_load_state("networkidle", timeout=15000)
                        await asyncio.sleep(2)
                        break
                except Exception:
                    continue

            await self.take_screenshot("round_page")
            logger.info(f"[{self.PLATFORM}] On round page: {self.page.url}")
            return True

        except Exception as e:
            await self.take_screenshot("navigate_error")
            logger.error(f"[{self.PLATFORM}] Navigate error: {e}")
            return False

    async def submit_tip(self, match: Dict, team_name: str) -> bool:
        try:
            logger.info(
                f"[{self.PLATFORM}] Submitting: {team_name} "
                f"({match['home_team']} vs {match['away_team']})"
            )

            # Superbru typically shows team logos/names as clickable elements
            selectors = [
                f'button:has-text("{team_name}")',
                f'div:has-text("{team_name}") >> button',
                f'[data-team*="{team_name}" i]',
                f'label:has-text("{team_name}")',
                f'span:has-text("{team_name}")',
                f'a:has-text("{team_name}")',
            ]

            for selector in selectors:
                try:
                    element = self.page.locator(selector).first
                    if await element.is_visible(timeout=2000):
                        await element.click()
                        await asyncio.sleep(1)
                        logger.info(f"[{self.PLATFORM}] Clicked: {team_name}")
                        return True
                except Exception:
                    continue

            await self.take_screenshot(f"tip_not_found_{team_name}")
            logger.error(f"[{self.PLATFORM}] Could not find element for: {team_name}")
            return False

        except Exception as e:
            logger.error(f"[{self.PLATFORM}] submit_tip error: {e}")
            return False

    async def save_tips(self) -> bool:
        try:
            save_selectors = [
                'button:has-text("Save Picks")',
                'button:has-text("Submit Picks")',
                'button:has-text("Save")',
                'button:has-text("Submit")',
                'button:has-text("Confirm")',
                'input[type="submit"]',
            ]

            for selector in save_selectors:
                try:
                    btn = self.page.locator(selector).first
                    if await btn.is_visible(timeout=2000):
                        await btn.click()
                        await asyncio.sleep(3)
                        logger.info(f"[{self.PLATFORM}] Tips saved")
                        return True
                except Exception:
                    continue

            logger.error(f"[{self.PLATFORM}] Could not find save button")
            await self.take_screenshot("save_failed")
            return False

        except Exception as e:
            logger.error(f"[{self.PLATFORM}] save_tips error: {e}")
            return False
