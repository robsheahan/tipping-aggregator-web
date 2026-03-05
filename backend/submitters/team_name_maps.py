"""
Team name mappings: canonical name -> platform display name.

Each platform may display team names differently (e.g. "GWS Giants" vs "GWS"
vs "Greater Western Sydney"). These maps let us click the right team button
on each platform.

Canonical names match those used in sport_matches / sport_tip_consensus
(sourced from TheOddsAPI).
"""

from typing import Dict, Optional
from loguru import logger


# AFL: canonical name -> platform display name
AFL_PLATFORM_NAMES: Dict[str, Dict[str, str]] = {
    "Adelaide Crows": {
        "afl_tipping": "Adelaide Crows",
        "superbru": "Adelaide",
        "espn_footytips": "Adelaide",
    },
    "Brisbane Lions": {
        "afl_tipping": "Brisbane Lions",
        "superbru": "Brisbane",
        "espn_footytips": "Brisbane",
    },
    "Carlton": {
        "afl_tipping": "Carlton",
        "superbru": "Carlton",
        "espn_footytips": "Carlton",
    },
    "Carlton Blues": {
        "afl_tipping": "Carlton",
        "superbru": "Carlton",
        "espn_footytips": "Carlton",
    },
    "Collingwood": {
        "afl_tipping": "Collingwood",
        "superbru": "Collingwood",
        "espn_footytips": "Collingwood",
    },
    "Collingwood Magpies": {
        "afl_tipping": "Collingwood",
        "superbru": "Collingwood",
        "espn_footytips": "Collingwood",
    },
    "Essendon": {
        "afl_tipping": "Essendon",
        "superbru": "Essendon",
        "espn_footytips": "Essendon",
    },
    "Fremantle": {
        "afl_tipping": "Fremantle",
        "superbru": "Fremantle",
        "espn_footytips": "Fremantle",
    },
    "Geelong Cats": {
        "afl_tipping": "Geelong Cats",
        "superbru": "Geelong",
        "espn_footytips": "Geelong",
    },
    "Gold Coast Suns": {
        "afl_tipping": "Gold Coast Suns",
        "superbru": "Gold Coast",
        "espn_footytips": "Gold Coast",
    },
    "GWS Giants": {
        "afl_tipping": "GWS Giants",
        "superbru": "GWS",
        "espn_footytips": "GWS Giants",
    },
    "Greater Western Sydney Giants": {
        "afl_tipping": "GWS Giants",
        "superbru": "GWS",
        "espn_footytips": "GWS Giants",
    },
    "Hawthorn": {
        "afl_tipping": "Hawthorn",
        "superbru": "Hawthorn",
        "espn_footytips": "Hawthorn",
    },
    "Hawthorn Hawks": {
        "afl_tipping": "Hawthorn",
        "superbru": "Hawthorn",
        "espn_footytips": "Hawthorn",
    },
    "Melbourne": {
        "afl_tipping": "Melbourne",
        "superbru": "Melbourne",
        "espn_footytips": "Melbourne",
    },
    "North Melbourne": {
        "afl_tipping": "North Melbourne",
        "superbru": "North Melbourne",
        "espn_footytips": "North Melbourne",
    },
    "Port Adelaide": {
        "afl_tipping": "Port Adelaide",
        "superbru": "Port Adelaide",
        "espn_footytips": "Port Adelaide",
    },
    "Richmond": {
        "afl_tipping": "Richmond",
        "superbru": "Richmond",
        "espn_footytips": "Richmond",
    },
    "St Kilda": {
        "afl_tipping": "St Kilda",
        "superbru": "St Kilda",
        "espn_footytips": "St Kilda",
    },
    "St Kilda Saints": {
        "afl_tipping": "St Kilda",
        "superbru": "St Kilda",
        "espn_footytips": "St Kilda",
    },
    "Sydney Swans": {
        "afl_tipping": "Sydney Swans",
        "superbru": "Sydney",
        "espn_footytips": "Sydney",
    },
    "West Coast Eagles": {
        "afl_tipping": "West Coast Eagles",
        "superbru": "West Coast",
        "espn_footytips": "West Coast",
    },
    "Western Bulldogs": {
        "afl_tipping": "Western Bulldogs",
        "superbru": "Western Bulldogs",
        "espn_footytips": "Western Bulldogs",
    },
}

# NRL: canonical name -> platform display name
NRL_PLATFORM_NAMES: Dict[str, Dict[str, str]] = {
    "Brisbane Broncos": {
        "nrl_tipping": "Brisbane Broncos",
        "superbru": "Brisbane",
        "espn_footytips": "Brisbane",
    },
    "Canberra Raiders": {
        "nrl_tipping": "Canberra Raiders",
        "superbru": "Canberra",
        "espn_footytips": "Canberra",
    },
    "Canterbury Bulldogs": {
        "nrl_tipping": "Canterbury-Bankstown Bulldogs",
        "superbru": "Canterbury",
        "espn_footytips": "Canterbury",
    },
    "Cronulla Sharks": {
        "nrl_tipping": "Cronulla-Sutherland Sharks",
        "superbru": "Cronulla",
        "espn_footytips": "Cronulla",
    },
    "Cronulla Sutherland Sharks": {
        "nrl_tipping": "Cronulla-Sutherland Sharks",
        "superbru": "Cronulla",
        "espn_footytips": "Cronulla",
    },
    "Dolphins": {
        "nrl_tipping": "Dolphins",
        "superbru": "Dolphins",
        "espn_footytips": "Dolphins",
    },
    "Gold Coast Titans": {
        "nrl_tipping": "Gold Coast Titans",
        "superbru": "Gold Coast",
        "espn_footytips": "Gold Coast",
    },
    "Manly Sea Eagles": {
        "nrl_tipping": "Manly-Warringah Sea Eagles",
        "superbru": "Manly",
        "espn_footytips": "Manly",
    },
    "Manly Warringah Sea Eagles": {
        "nrl_tipping": "Manly-Warringah Sea Eagles",
        "superbru": "Manly",
        "espn_footytips": "Manly",
    },
    "Melbourne Storm": {
        "nrl_tipping": "Melbourne Storm",
        "superbru": "Melbourne",
        "espn_footytips": "Melbourne",
    },
    "Newcastle Knights": {
        "nrl_tipping": "Newcastle Knights",
        "superbru": "Newcastle",
        "espn_footytips": "Newcastle",
    },
    "New Zealand Warriors": {
        "nrl_tipping": "New Zealand Warriors",
        "superbru": "Warriors",
        "espn_footytips": "Warriors",
    },
    "North Queensland Cowboys": {
        "nrl_tipping": "North Queensland Cowboys",
        "superbru": "North Queensland",
        "espn_footytips": "North Queensland",
    },
    "Parramatta Eels": {
        "nrl_tipping": "Parramatta Eels",
        "superbru": "Parramatta",
        "espn_footytips": "Parramatta",
    },
    "Penrith Panthers": {
        "nrl_tipping": "Penrith Panthers",
        "superbru": "Penrith",
        "espn_footytips": "Penrith",
    },
    "South Sydney Rabbitohs": {
        "nrl_tipping": "South Sydney Rabbitohs",
        "superbru": "South Sydney",
        "espn_footytips": "South Sydney",
    },
    "St George Illawarra Dragons": {
        "nrl_tipping": "St George Illawarra Dragons",
        "superbru": "St George Illawarra",
        "espn_footytips": "St George Illawarra",
    },
    "Sydney Roosters": {
        "nrl_tipping": "Sydney Roosters",
        "superbru": "Sydney Roosters",
        "espn_footytips": "Sydney Roosters",
    },
    "Wests Tigers": {
        "nrl_tipping": "Wests Tigers",
        "superbru": "Wests Tigers",
        "espn_footytips": "Wests Tigers",
    },
}


def get_platform_team_name(canonical_name: str, platform: str, sport: str) -> Optional[str]:
    """
    Get the platform-specific display name for a team.
    Falls back to canonical name if no mapping exists.
    """
    names = AFL_PLATFORM_NAMES if sport == "afl" else NRL_PLATFORM_NAMES
    team_map = names.get(canonical_name)
    if not team_map:
        logger.warning(f"No platform name map for '{canonical_name}' ({sport})")
        return canonical_name
    return team_map.get(platform, canonical_name)
