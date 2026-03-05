"""
AFL Tipping submitter — tipping.afl.com.au

Login: AFL iD (email/password form)
Flow: Login -> My Comps -> Select comp -> Current round -> Click teams -> Save
"""

import os
import asyncio
from typing import Dict

from loguru import logger
from submitters.base_submitter import BaseSubmitter


class AFLTippingSubmitter(BaseSubmitter):
    PLATFORM = "afl_tipping"
    SPORT = "afl"
    LOGIN_URL = "https://tipping.afl.com.au/login"
    TIPPING_URL = "https://tipping.afl.com.au/tipping"

    def _get_credentials(self) -> Dict[str, str]:
        return {
            "email": os.getenv("AFL_TIPPING_EMAIL", ""),
            "password": os.getenv("AFL_TIPPING_PASSWORD", ""),
            "comp_id": os.getenv("AFL_TIPPING_COMP_ID", ""),
        }

    async def login(self) -> bool:
        creds = self._get_credentials()
        if not creds["email"] or not creds["password"]:
            logger.error(f"[{self.PLATFORM}] Missing AFL_TIPPING_EMAIL or AFL_TIPPING_PASSWORD")
            return False

        await self.page.goto(self.LOGIN_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        # AFL iD login form — find email and password fields
        # These selectors may need adjustment after initial headed run
        try:
            # Try common email field selectors
            email_field = self.page.locator('input[type="email"], input[name="email"], input[id="email"]').first
            await email_field.fill(creds["email"])

            password_field = self.page.locator('input[type="password"]').first
            await password_field.fill(creds["password"])

            # Click login/submit button
            submit_btn = self.page.locator(
                'button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")'
            ).first
            await submit_btn.click()

            # Wait for navigation after login
            await self.page.wait_for_load_state("networkidle", timeout=15000)
            await asyncio.sleep(2)

            # Verify login succeeded — check we're not still on login page
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
        try:
            creds = self._get_credentials()

            # Navigate to tipping page (or comp-specific URL)
            if creds["comp_id"]:
                url = f"{self.TIPPING_URL}/{creds['comp_id']}"
            else:
                url = self.TIPPING_URL

            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

            # The current round should be shown by default
            # Take screenshot to verify we're on the right page
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

            # Find the team button/element to click
            # Try multiple selector strategies
            selectors = [
                f'button:has-text("{team_name}")',
                f'div:has-text("{team_name}") >> button',
                f'[data-team="{team_name}"]',
                f'label:has-text("{team_name}")',
                f'text="{team_name}"',
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

            # If exact match failed, try partial text match
            try:
                # Try clicking any element containing the team name
                element = self.page.locator(f'*:has-text("{team_name}")').last
                if await element.is_visible(timeout=2000):
                    await element.click()
                    await asyncio.sleep(1)
                    logger.info(f"[{self.PLATFORM}] Clicked (partial): {team_name}")
                    return True
            except Exception:
                pass

            await self.take_screenshot(f"tip_not_found_{team_name}")
            logger.error(f"[{self.PLATFORM}] Could not find element for: {team_name}")
            return False

        except Exception as e:
            logger.error(f"[{self.PLATFORM}] submit_tip error: {e}")
            return False

    async def save_tips(self) -> bool:
        try:
            # Look for save/submit/confirm button
            save_selectors = [
                'button:has-text("Save")',
                'button:has-text("Submit")',
                'button:has-text("Confirm")',
                'button:has-text("Save Tips")',
                'button[type="submit"]',
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
