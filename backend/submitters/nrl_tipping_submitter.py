"""
NRL Tipping submitter — tipping.nrl.com

Login: NRL account (email/password form)
Flow: Login -> My Comps -> Select comp -> Current round -> Click teams -> Save
"""

import os
import asyncio
from typing import Dict

from loguru import logger
from submitters.base_submitter import BaseSubmitter


class NRLTippingSubmitter(BaseSubmitter):
    PLATFORM = "nrl_tipping"
    SPORT = "nrl"
    LOGIN_URL = "https://tipping.nrl.com/login"
    TIPPING_URL = "https://tipping.nrl.com/tipping"

    def _get_credentials(self) -> Dict[str, str]:
        return {
            "email": os.getenv("NRL_TIPPING_EMAIL", ""),
            "password": os.getenv("NRL_TIPPING_PASSWORD", ""),
            "comp_id": os.getenv("NRL_TIPPING_COMP_ID", ""),
        }

    async def login(self) -> bool:
        creds = self._get_credentials()
        if not creds["email"] or not creds["password"]:
            logger.error(f"[{self.PLATFORM}] Missing NRL_TIPPING_EMAIL or NRL_TIPPING_PASSWORD")
            return False

        await self.page.goto(self.LOGIN_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        try:
            email_field = self.page.locator('input[type="email"], input[name="email"], input[id="email"]').first
            await email_field.fill(creds["email"])

            password_field = self.page.locator('input[type="password"]').first
            await password_field.fill(creds["password"])

            submit_btn = self.page.locator(
                'button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")'
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
        try:
            creds = self._get_credentials()

            if creds["comp_id"]:
                url = f"{self.TIPPING_URL}/{creds['comp_id']}"
            else:
                url = self.TIPPING_URL

            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

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

            try:
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
