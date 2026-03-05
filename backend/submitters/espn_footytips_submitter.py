"""
ESPN FootyTips submitter — footytips.espn.com.au

Most complex auth — uses ESPN account with possible cross-domain login flow.
Login: ESPN account (email/password), may redirect through ESPN ID portal.
Flow: Login -> My Comps -> Select comp -> Current round -> Click teams -> Save
"""

import os
import asyncio
from typing import Dict

from loguru import logger
from submitters.base_submitter import BaseSubmitter


class ESPNFootyTipsSubmitter(BaseSubmitter):
    PLATFORM = "espn_footytips"
    SPORT = "afl"  # FootyTips is AFL-focused (NRL may be separate comp)
    LOGIN_URL = "https://footytips.espn.com.au/login"
    TIPPING_URL = "https://footytips.espn.com.au/tipping"

    def _get_credentials(self) -> Dict[str, str]:
        return {
            "email": os.getenv("ESPN_FOOTYTIPS_EMAIL", ""),
            "password": os.getenv("ESPN_FOOTYTIPS_PASSWORD", ""),
            "comp_id": os.getenv("ESPN_FOOTYTIPS_COMP_ID", ""),
        }

    async def login(self) -> bool:
        creds = self._get_credentials()
        if not creds["email"] or not creds["password"]:
            logger.error(f"[{self.PLATFORM}] Missing ESPN_FOOTYTIPS_EMAIL or ESPN_FOOTYTIPS_PASSWORD")
            return False

        await self.page.goto(self.LOGIN_URL, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)  # ESPN login can be slow

        try:
            # ESPN login may use an iframe or redirect to id.espn.com
            # Check if there's an iframe first
            frames = self.page.frames
            login_frame = None
            for frame in frames:
                if "espn" in frame.url and ("login" in frame.url or "id." in frame.url):
                    login_frame = frame
                    break

            target = login_frame if login_frame else self.page

            # ESPN ID login — may show email first, then password
            email_field = target.locator(
                'input[type="email"], input[name="email"], input[id="InputLoginValue"], '
                'input[placeholder*="email" i], input[name="username"]'
            ).first
            await email_field.fill(creds["email"])

            # Some ESPN flows show email first, then a "Continue" button
            try:
                continue_btn = target.locator(
                    'button:has-text("Continue"), button:has-text("Next")'
                ).first
                if await continue_btn.is_visible(timeout=2000):
                    await continue_btn.click()
                    await asyncio.sleep(2)
            except Exception:
                pass

            password_field = target.locator('input[type="password"]').first
            await password_field.fill(creds["password"])

            submit_btn = target.locator(
                'button[type="submit"], button:has-text("Log In"), '
                'button:has-text("Sign In"), button:has-text("Login")'
            ).first
            await submit_btn.click()

            # Wait for redirect back to footytips
            await self.page.wait_for_load_state("networkidle", timeout=20000)
            await asyncio.sleep(3)

            # Verify login — check for user menu or profile indicator
            current_url = self.page.url
            if "login" in current_url.lower() and "id.espn" not in current_url.lower():
                await self.take_screenshot("login_failed")
                logger.error(f"[{self.PLATFORM}] Still on login page after submit")
                return False

            logger.info(f"[{self.PLATFORM}] Login successful (URL: {current_url})")
            return True

        except Exception as e:
            await self.take_screenshot("login_error")
            logger.error(f"[{self.PLATFORM}] Login error: {e}")
            return False

    async def navigate_to_round(self) -> bool:
        try:
            creds = self._get_credentials()

            if creds["comp_id"]:
                url = f"{self.TIPPING_URL}?competitionId={creds['comp_id']}"
            else:
                url = self.TIPPING_URL

            await self.page.goto(url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)

            # FootyTips may need to click into the current round
            try:
                current_round = self.page.locator(
                    'a:has-text("Current Round"), a:has-text("This Round"), '
                    'button:has-text("Current Round")'
                ).first
                if await current_round.is_visible(timeout=3000):
                    await current_round.click()
                    await asyncio.sleep(2)
            except Exception:
                pass  # May already be on current round

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

            # FootyTips uses clickable team elements (often radio-button style)
            selectors = [
                f'button:has-text("{team_name}")',
                f'label:has-text("{team_name}")',
                f'div:has-text("{team_name}") >> input[type="radio"]',
                f'div:has-text("{team_name}") >> button',
                f'[data-team*="{team_name}" i]',
                f'td:has-text("{team_name}")',
                f'span:has-text("{team_name}")',
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

            # Fallback: try img alt text (FootyTips uses team logos)
            try:
                logo = self.page.locator(f'img[alt*="{team_name}" i]').first
                if await logo.is_visible(timeout=2000):
                    await logo.click()
                    await asyncio.sleep(1)
                    logger.info(f"[{self.PLATFORM}] Clicked logo: {team_name}")
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
                'button:has-text("Save Tips")',
                'button:has-text("Submit Tips")',
                'button:has-text("Save")',
                'button:has-text("Submit")',
                'input[type="submit"][value*="Save" i]',
                'input[type="submit"][value*="Submit" i]',
                'a:has-text("Save Tips")',
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
