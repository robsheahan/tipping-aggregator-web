"""
Claude AI Analyzer for Expert Tips

Uses Anthropic's Claude API to:
1. Extract confidence scores from tipster text
2. Categorize tips (Best Bet, Value, Avoid, Neutral)
3. Generate consensus verdicts
"""

import os
from typing import Dict, List
from anthropic import Anthropic
from loguru import logger
import json

class ClaudeAnalyzer:
    """
    Wrapper for Claude AI analysis
    """

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        self.client = Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-5-20250929"

    async def analyze_tip(self, tip_text: str) -> Dict:
        """
        Analyze a tipster's comment and extract:
        - confidence_score (0-100)
        - category (best_bet, value, avoid, neutral)
        - summary (concise explanation)

        Args:
            tip_text: Raw text from tipster

        Returns:
            Dict with confidence_score, category, summary
        """
        try:
            prompt = f"""You are analyzing a horse racing expert's tip. Extract the following information:

1. **Confidence Score (0-100)**: Based on the tipster's tone, how confident are they?
   - 90-100: Extremely confident ("best bet", "can't lose", "banker")
   - 70-89: Very confident ("strong chance", "expect to win")
   - 50-69: Moderately confident ("each way chance", "place hope")
   - 30-49: Mild interest ("worth a look", "outsider")
   - 0-29: Negative or avoid ("struggling", "out of form")

2. **Category**: Classify the tip as ONE of:
   - best_bet: Tipster's top pick / best bet
   - value: Good value at current odds
   - avoid: Recommended to avoid
   - neutral: No strong opinion

3. **Summary**: One short sentence explaining their view (max 15 words)

EXPERT TIP TEXT:
{tip_text}

Respond in JSON format:
{{
    "confidence_score": <number 0-100>,
    "category": "<best_bet|value|avoid|neutral>",
    "summary": "<brief explanation>"
}}"""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.3,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Parse response
            response_text = message.content[0].text.strip()

            # Extract JSON (Claude sometimes wraps in markdown code blocks)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            result = json.loads(response_text)

            # Validate
            if not (0 <= result['confidence_score'] <= 100):
                result['confidence_score'] = 50  # Default

            if result['category'] not in ['best_bet', 'value', 'avoid', 'neutral']:
                result['category'] = 'neutral'  # Default

            return result

        except Exception as e:
            logger.error(f"Error analyzing tip with Claude: {e}", exc_info=True)
            # Return neutral defaults on error
            return {
                "confidence_score": 50,
                "category": "neutral",
                "summary": "Unable to analyze tip"
            }

    async def generate_verdict(
        self,
        runner_name: str,
        tips: List[Dict],
        consensus_score: int
    ) -> str:
        """
        Generate a 1-sentence AI verdict summarizing all tips for a runner

        Args:
            runner_name: Name of the horse
            tips: List of expert tips (dicts with source, confidence, summary)
            consensus_score: Calculated consensus score (0-100)

        Returns:
            One-sentence summary
        """
        try:
            # Build tips summary
            tips_text = "\n".join([
                f"- {tip['source']} (confidence {tip['confidence_score']}): {tip.get('ai_summary', '')}"
                for tip in tips
            ])

            prompt = f"""You are summarizing expert opinions on a horse in a race.

HORSE: {runner_name}
CONSENSUS SCORE: {consensus_score}/100

EXPERT TIPS:
{tips_text}

Generate ONE sentence (max 20 words) that:
1. Captures the overall sentiment
2. Mentions agreement level if relevant (e.g., "3/5 experts agree")
3. Notes any key concerns or strengths

Examples:
- "3/5 experts agree this horse is the class of the field but warn about the heavy track"
- "Strong consensus pick with top jockey despite wide barrier"
- "Mixed opinions - some see value but others concerned about recent form"

Your verdict:"""

            message = self.client.messages.create(
                model=self.model,
                max_tokens=100,
                temperature=0.5,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            verdict = message.content[0].text.strip()

            # Remove quotes if Claude added them
            verdict = verdict.strip('"').strip("'")

            return verdict

        except Exception as e:
            logger.error(f"Error generating verdict with Claude: {e}", exc_info=True)
            return f"{len(tips)} expert tips available for {runner_name}"

    async def batch_analyze_tips(self, tips: List[str]) -> List[Dict]:
        """
        Analyze multiple tips in parallel (with rate limiting)

        Args:
            tips: List of tip texts

        Returns:
            List of analysis results
        """
        import asyncio

        results = []
        for tip in tips:
            result = await self.analyze_tip(tip)
            results.append(result)

            # Rate limit: ~4 requests per second for Claude API
            await asyncio.sleep(0.25)

        return results
