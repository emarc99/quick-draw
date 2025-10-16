use starknet::ContractAddress;

// Match status enum
#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug, DojoStore, Default)]
pub enum MatchStatus {
    #[default]
    Waiting,
    InProgress,
    Complete,
}

// Match Model - Main game state
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Match {
    #[key]
    pub match_id: u32,
    pub player1: ContractAddress,
    pub player2: ContractAddress,
    pub wager_amount: u256,
    pub rounds_won_p1: u8,
    pub rounds_won_p2: u8,
    pub current_round: u8,
    pub status: MatchStatus,
}

// RoundCommitment Model - Handles commit-reveal pattern
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct RoundCommitment {
    #[key]
    pub match_id: u32,
    #[key]
    pub round: u8,
    pub player1_commit: felt252,
    pub player2_commit: felt252,
    pub player1_revealed: bool,
    pub player2_revealed: bool,
    pub player1_action: u8,  // 0=none, 1=Attack, 2=Defend, 3=Special
    pub player2_action: u8,
}

// PlayerStats Model - Track player performance
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct PlayerStats {
    #[key]
    pub player: ContractAddress,
    pub wins: u32,
    pub losses: u32,
    pub total_wagered: u256,
    pub total_won: u256,
}

// Action enum for game moves
#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug, DojoStore, Default)]
pub enum Action {
    #[default]
    None,
    Attack,
    Defend,
    Special,
}

impl ActionIntoU8 of Into<Action, u8> {
    fn into(self: Action) -> u8 {
        match self {
            Action::None => 0,
            Action::Attack => 1,
            Action::Defend => 2,
            Action::Special => 3,
        }
    }
}

impl U8IntoAction of Into<u8, Action> {
    fn into(self: u8) -> Action {
        if self == 1 {
            Action::Attack
        } else if self == 2 {
            Action::Defend
        } else if self == 3 {
            Action::Special
        } else {
            Action::None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Action, ActionIntoU8, U8IntoAction};

    #[test]
    fn test_action_conversion() {
        let attack: u8 = Action::Attack.into();
        assert(attack == 1, 'attack should be 1');

        let defend: u8 = Action::Defend.into();
        assert(defend == 2, 'defend should be 2');

        let special: u8 = Action::Special.into();
        assert(special == 3, 'special should be 3');
    }
}
