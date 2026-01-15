"""
Demo: Test AI Features with Mock UK Racing Data

This script demonstrates the AI-powered tipping analysis without needing live API data.
It simulates:
1. A UK race meeting (Cheltenham)
2. Expert tips from multiple sources
3. Claude AI analysis of those tips
4. Consensus score generation
5. AI verdict creation
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

load_dotenv()

from utils.claude_analyzer import ClaudeAnalyzer
from utils.database import SupabaseClient
from models.database import Meet, Race, Runner, ExpertTip, ConsensusScore, RaceOdds

async def create_mock_race_data():
    """Create sample UK race data"""
    print("\n" + "=" * 60)
    print("STEP 1: Creating Mock UK Race Data")
    print("=" * 60)

    # Create a meet
    meet = Meet(
        id="cheltenham-2026-01-15",
        date="2026-01-15",
        venue="Cheltenham",
        country="UK",
        region="England",
        num_races=8
    )

    # Create a race with runners
    race_time = datetime.now() + timedelta(hours=2)

    runners = [
        Runner(number=1, name="Constitution Hill", jockey="Nico de Boinville", trainer="Nicky Henderson", weight="11-10", barrier=1),
        Runner(number=2, name="State Man", jockey="Paul Townend", trainer="Willie Mullins", weight="11-10", barrier=2),
        Runner(number=3, name="Honeysuckle", jockey="Rachael Blackmore", trainer="Henry de Bromhead", weight="11-07", barrier=3),
        Runner(number=4, name="Appreciate It", jockey="Jack Kennedy", trainer="Willie Mullins", weight="11-10", barrier=4),
        Runner(number=5, name="Sir Gerhard", jockey="Davy Russell", trainer="Gordon Elliott", weight="11-10", barrier=5),
        Runner(number=6, name="Zanahiyr", jockey="Harry Cobden", trainer="Paul Nicholls", weight="11-10", barrier=6),
    ]

    race = Race(
        id="cheltenham-2026-01-15-1",
        meet_id=meet.id,
        venue="Cheltenham",
        race_number=1,
        race_name="Champion Hurdle Challenge Trophy",
        start_time=race_time,
        distance="3m 2f",
        race_class="Grade 1",
        track_condition="Good to Soft",
        weather="Overcast",
        status="upcoming",
        runners=runners
    )

    print(f"✅ Created mock race:")
    print(f"   Venue: {race.venue}")
    print(f"   Race: {race.race_name}")
    print(f"   Runners: {len(runners)}")
    for runner in runners[:3]:
        print(f"   - #{runner.number}: {runner.name} ({runner.jockey})")

    return meet, race


async def create_mock_expert_tips(race):
    """Create sample expert tips for the race"""
    print("\n" + "=" * 60)
    print("STEP 2: Creating Mock Expert Tips")
    print("=" * 60)

    tips = [
        ExpertTip(
            race_id=race.id,
            runner_name="Constitution Hill",
            runner_number=1,
            source="Racing Post",
            expert_name="Tom Segal",
            raw_text="Constitution Hill is a banker for me here. Unbeaten over hurdles and looks a class above these rivals. Back him with confidence at Cheltenham where he excels. Can't see anything beating him unless he falls.",
            confidence_score=0,  # Will be analyzed by Claude
            category="neutral",  # Will be analyzed by Claude
            ai_summary="",  # Will be analyzed by Claude
        ),
        ExpertTip(
            race_id=race.id,
            runner_name="State Man",
            runner_number=2,
            source="Timeform",
            expert_name="David Johnson",
            raw_text="State Man has been in great form for Willie Mullins and should run a big race. Each-way value at the prices, especially with Townend riding. Solid place chance but needs to improve to beat Constitution Hill.",
            confidence_score=0,
            category="neutral",
            ai_summary="",
        ),
        ExpertTip(
            race_id=race.id,
            runner_name="Constitution Hill",
            runner_number=1,
            source="At The Races",
            expert_name="Matt Chapman",
            raw_text="This is Constitution Hill's race to lose. Absolutely bombproof and Nicky Henderson has him cherry ripe. My best bet of the day without question. He's head and shoulders above these.",
            confidence_score=0,
            category="neutral",
            ai_summary="",
        ),
        ExpertTip(
            race_id=race.id,
            runner_name="Honeysuckle",
            runner_number=3,
            source="Sporting Life",
            expert_name="Richard Hoiles",
            raw_text="Honeysuckle is a legend but may be past her best now. Struggled last time out and at 10 years old, this might be one race too far. Would avoid at short prices, plenty of younger legs to worry about.",
            confidence_score=0,
            category="neutral",
            ai_summary="",
        ),
        ExpertTip(
            race_id=race.id,
            runner_name="Zanahiyr",
            runner_number=6,
            source="Racing Post",
            expert_name="Paul Kealy",
            raw_text="Zanahiyr is an interesting outsider for Paul Nicholls. Showed promise last time and could outrun his odds. Worth a small each-way punt as a saver at big prices.",
            confidence_score=0,
            category="neutral",
            ai_summary="",
        ),
    ]

    print(f"✅ Created {len(tips)} expert tips:")
    for tip in tips:
        print(f"\n   {tip.source} on {tip.runner_name}:")
        print(f"   \"{tip.raw_text[:80]}...\"")

    return tips


async def analyze_tips_with_claude(tips):
    """Use Claude AI to analyze expert tips"""
    print("\n" + "=" * 60)
    print("STEP 3: Analyzing Tips with Claude AI")
    print("=" * 60)

    claude = ClaudeAnalyzer()
    analyzed_tips = []

    for i, tip in enumerate(tips, 1):
        print(f"\n   Analyzing tip {i}/{len(tips)} from {tip.source}...")

        # Analyze with Claude
        analysis = await claude.analyze_tip(tip.raw_text)

        # Update tip with AI analysis
        tip.confidence_score = analysis['confidence_score']
        tip.category = analysis['category']
        tip.ai_summary = analysis['summary']

        analyzed_tips.append(tip)

        print(f"   ✅ {tip.runner_name}:")
        print(f"      Confidence: {tip.confidence_score}/100")
        print(f"      Category: {tip.category}")
        print(f"      AI Summary: {tip.ai_summary}")

        # Small delay to respect rate limits
        await asyncio.sleep(0.3)

    return analyzed_tips


async def calculate_consensus_scores(race, analyzed_tips):
    """Calculate consensus scores for each runner"""
    print("\n" + "=" * 60)
    print("STEP 4: Calculating Consensus Scores")
    print("=" * 60)

    # Group tips by runner
    tips_by_runner = {}
    for tip in analyzed_tips:
        runner_num = tip.runner_number
        if runner_num not in tips_by_runner:
            tips_by_runner[runner_num] = []
        tips_by_runner[runner_num].append(tip)

    consensus_scores = []

    for runner in race.runners:
        runner_tips = tips_by_runner.get(runner.number, [])

        if not runner_tips:
            continue

        # Calculate average confidence
        avg_confidence = sum(t.confidence_score for t in runner_tips) / len(runner_tips)

        # Mock odds (in real system, these come from bookmakers)
        mock_odds = {1: 1.50, 2: 4.50, 3: 8.00, 4: 12.00, 5: 15.00, 6: 25.00}

        consensus = ConsensusScore(
            race_id=race.id,
            runner_number=runner.number,
            runner_name=runner.name,
            consensus_score=int(avg_confidence),
            num_tips=len(runner_tips),
            best_odds=mock_odds.get(runner.number, 10.0),
            best_bookmaker="Bet365",
            tip_breakdown={tip.source: tip.confidence_score for tip in runner_tips},
            ai_verdict=""  # Will be generated next
        )

        consensus_scores.append(consensus)

        print(f"\n   {runner.name}:")
        print(f"      Consensus Score: {consensus.consensus_score}/100")
        print(f"      Number of Tips: {consensus.num_tips}")
        print(f"      Best Odds: {consensus.best_odds}")

    return consensus_scores


async def generate_ai_verdicts(consensus_scores, analyzed_tips, race):
    """Generate AI verdicts for each runner"""
    print("\n" + "=" * 60)
    print("STEP 5: Generating AI Verdicts")
    print("=" * 60)

    claude = ClaudeAnalyzer()

    for consensus in consensus_scores:
        # Get all tips for this runner
        runner_tips = [
            {
                'source': tip.source,
                'confidence_score': tip.confidence_score,
                'ai_summary': tip.ai_summary
            }
            for tip in analyzed_tips
            if tip.runner_number == consensus.runner_number
        ]

        # Generate verdict
        verdict = await claude.generate_verdict(
            runner_name=consensus.runner_name,
            tips=runner_tips,
            consensus_score=consensus.consensus_score
        )

        consensus.ai_verdict = verdict

        print(f"\n   {consensus.runner_name}:")
        print(f"      AI Verdict: \"{verdict}\"")

        await asyncio.sleep(0.3)

    return consensus_scores


async def save_to_database(meet, race, analyzed_tips, consensus_scores):
    """Save all data to Supabase"""
    print("\n" + "=" * 60)
    print("STEP 6: Saving to Database")
    print("=" * 60)

    db = SupabaseClient()

    # Save meet
    try:
        await db.upsert_meet(meet)
        print(f"✅ Saved meet: {meet.venue}")
    except Exception as e:
        print(f"⚠️  Meet save warning: {str(e)[:100]}")

    # Save race
    try:
        await db.upsert_race(race)
        print(f"✅ Saved race: {race.race_name}")
    except Exception as e:
        print(f"⚠️  Race save warning: {str(e)[:100]}")

    # Save mock odds
    for runner in race.runners:
        mock_odds = {1: 1.50, 2: 4.50, 3: 8.00, 4: 12.00, 5: 15.00, 6: 25.00}
        odds = RaceOdds(
            race_id=race.id,
            runner_number=runner.number,
            bookmaker="Bet365",
            odds=mock_odds.get(runner.number, 10.0)
        )
        await db.save_odds(odds)
    print(f"✅ Saved odds for {len(race.runners)} runners")

    # Save tips
    for tip in analyzed_tips:
        await db.save_expert_tip(tip)
    print(f"✅ Saved {len(analyzed_tips)} expert tips")

    # Save consensus scores
    for consensus in consensus_scores:
        await db.save_consensus_score(consensus)
        await db.update_consensus_verdict(
            consensus.race_id,
            consensus.runner_number,
            consensus.ai_verdict
        )
    print(f"✅ Saved {len(consensus_scores)} consensus scores with AI verdicts")


async def main():
    print("\n" + "=" * 70)
    print("   🏇 AI-POWERED RACING TIPS ANALYZER - DEMO")
    print("=" * 70)
    print("\nThis demo shows how the AI features work:")
    print("  • Claude AI analyzes expert tips and extracts confidence scores")
    print("  • Generates consensus scores based on multiple expert opinions")
    print("  • Creates AI-generated verdicts summarizing all tips")
    print("\nUsing: Claude Sonnet 4.5 Model")

    try:
        # Step 1: Create mock data
        meet, race = await create_mock_race_data()

        # Step 2: Create expert tips
        tips = await create_mock_expert_tips(race)

        # Step 3: Analyze with Claude AI
        analyzed_tips = await analyze_tips_with_claude(tips)

        # Step 4: Calculate consensus
        consensus_scores = await calculate_consensus_scores(race, analyzed_tips)

        # Step 5: Generate AI verdicts
        consensus_with_verdicts = await generate_ai_verdicts(
            consensus_scores,
            analyzed_tips,
            race
        )

        # Step 6: Save to database
        await save_to_database(meet, race, analyzed_tips, consensus_with_verdicts)

        # Summary
        print("\n" + "=" * 70)
        print("   ✅ DEMO COMPLETE!")
        print("=" * 70)
        print("\n📊 Results Summary:")
        print(f"   • Analyzed {len(analyzed_tips)} expert tips using Claude AI")
        print(f"   • Generated consensus scores for {len(consensus_scores)} horses")
        print(f"   • Created AI verdicts for each runner")
        print(f"   • All data saved to Supabase database")

        print("\n🔝 Top Consensus Picks:")
        sorted_consensus = sorted(consensus_scores, key=lambda x: x.consensus_score, reverse=True)
        for i, c in enumerate(sorted_consensus[:3], 1):
            print(f"   {i}. {c.runner_name} - Score: {c.consensus_score}/100 @ {c.best_odds}")
            print(f"      💬 \"{c.ai_verdict}\"")

        print("\n💡 Next Steps:")
        print("   • Check your Supabase dashboard to see the data")
        print("   • Run the frontend to view the racing grid")
        print("   • When you get the Australian add-on, this will run automatically!")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
