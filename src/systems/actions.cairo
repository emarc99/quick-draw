use quick_draw_arena::models::{Match, MatchStatus, RoundCommitment, PlayerStats};
use starknet::ContractAddress;

// define the interface
#[starknet::interface]
pub trait IActions<T> {
    fn create_match(ref self: T, wager: u256) -> u32;
    fn join_match(ref self: T, match_id: u32);
    fn commit_action(ref self: T, match_id: u32, commitment: felt252);
    fn reveal_action(ref self: T, match_id: u32, action: u8, salt: felt252);
}

// dojo decorator
#[dojo::contract]
pub mod actions {
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use quick_draw_arena::models::{Match, MatchStatus, RoundCommitment, PlayerStats, Action};
    use starknet::{ContractAddress, get_caller_address};
    use super::IActions;
    use core::poseidon::poseidon_hash_span;

    // Events
    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct MatchCreated {
        #[key]
        pub match_id: u32,
        pub player1: ContractAddress,
        pub wager: u256,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct MatchJoined {
        #[key]
        pub match_id: u32,
        pub player2: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ActionCommitted {
        #[key]
        pub match_id: u32,
        pub round: u8,
        pub player: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ActionRevealed {
        #[key]
        pub match_id: u32,
        pub round: u8,
        pub player: ContractAddress,
        pub action: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct RoundComplete {
        #[key]
        pub match_id: u32,
        pub round: u8,
        pub winner: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct MatchComplete {
        #[key]
        pub match_id: u32,
        pub winner: ContractAddress,
        pub prize: u256,
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn create_match(ref self: ContractState, wager: u256) -> u32 {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Generate unique match_id using timestamp and player address
            let block_info = starknet::get_block_info().unbox();
            let match_id: u32 = (block_info.block_timestamp % 1000000).try_into().unwrap();

            // Create new match
            let new_match = Match {
                match_id,
                player1: player,
                player2: starknet::contract_address_const::<0>(),
                wager_amount: wager,
                rounds_won_p1: 0,
                rounds_won_p2: 0,
                current_round: 1,
                status: MatchStatus::Waiting,
            };

            // Write to world
            world.write_model(@new_match);

            // Emit event
            world.emit_event(@MatchCreated { match_id, player1: player, wager });

            match_id
        }

        fn join_match(ref self: ContractState, match_id: u32) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Read match from world
            let mut match_data: Match = world.read_model(match_id);

            // Validate match status
            assert(match_data.status == MatchStatus::Waiting, 'Match not waiting');
            assert(match_data.player1 != player, 'Cannot join own match');
            assert(
                match_data.player2 == starknet::contract_address_const::<0>(),
                'Match already full'
            );

            // Update match
            match_data.player2 = player;
            match_data.status = MatchStatus::InProgress;

            // Initialize first round commitment
            let round_commitment = RoundCommitment {
                match_id,
                round: 1,
                player1_commit: 0,
                player2_commit: 0,
                player1_revealed: false,
                player2_revealed: false,
                player1_action: 0,
                player2_action: 0,
            };

            // Write updates
            world.write_model(@match_data);
            world.write_model(@round_commitment);

            // Emit event
            world.emit_event(@MatchJoined { match_id, player2: player });
        }

        fn commit_action(ref self: ContractState, match_id: u32, commitment: felt252) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Read match
            let match_data: Match = world.read_model(match_id);
            assert(match_data.status == MatchStatus::InProgress, 'Match not in progress');

            // Read round commitment
            let mut round_commit: RoundCommitment = world
                .read_model((match_id, match_data.current_round));

            // Determine which player and store commitment
            if player == match_data.player1 {
                assert(round_commit.player1_commit == 0, 'Already committed');
                round_commit.player1_commit = commitment;
            } else if player == match_data.player2 {
                assert(round_commit.player2_commit == 0, 'Already committed');
                round_commit.player2_commit = commitment;
            } else {
                panic!("Not a player in match");
            }

            // Write update
            world.write_model(@round_commit);

            // Emit event
            world
                .emit_event(
                    @ActionCommitted { match_id, round: match_data.current_round, player }
                );
        }

        fn reveal_action(ref self: ContractState, match_id: u32, action: u8, salt: felt252) {
            let mut world = self.world_default();
            let player = get_caller_address();

            // Read match
            let mut match_data: Match = world.read_model(match_id);
            assert(match_data.status == MatchStatus::InProgress, 'Match not in progress');

            // Read round commitment
            let mut round_commit: RoundCommitment = world
                .read_model((match_id, match_data.current_round));

            // Verify commitment using Poseidon hash
            let mut hash_data = ArrayTrait::new();
            hash_data.append(action.into());
            hash_data.append(salt);
            let computed_hash = poseidon_hash_span(hash_data.span());

            // Store revealed action and verify
            let is_player1 = player == match_data.player1;
            let is_player2 = player == match_data.player2;

            if is_player1 {
                assert(round_commit.player1_commit == computed_hash, 'Invalid commitment');
                assert(!round_commit.player1_revealed, 'Already revealed');
                round_commit.player1_action = action;
                round_commit.player1_revealed = true;
            } else if is_player2 {
                assert(round_commit.player2_commit == computed_hash, 'Invalid commitment');
                assert(!round_commit.player2_revealed, 'Already revealed');
                round_commit.player2_action = action;
                round_commit.player2_revealed = true;
            } else {
                panic!("Not a player in match");
            }

            // Emit reveal event
            world
                .emit_event(
                    @ActionRevealed { match_id, round: match_data.current_round, player, action }
                );

            // Check if both players revealed
            if round_commit.player1_revealed && round_commit.player2_revealed {
                // Resolve round
                let winner = resolve_round(
                    round_commit.player1_action,
                    round_commit.player2_action,
                    match_data.player1,
                    match_data.player2
                );

                // Update rounds won
                if winner == match_data.player1 {
                    match_data.rounds_won_p1 += 1;
                } else if winner == match_data.player2 {
                    match_data.rounds_won_p2 += 1;
                }

                // Emit round complete event
                world
                    .emit_event(
                        @RoundComplete { match_id, round: match_data.current_round, winner }
                    );

                // Check if match is complete (first to 2 wins)
                if match_data.rounds_won_p1 == 2 || match_data.rounds_won_p2 == 2 {
                    // Match complete
                    match_data.status = MatchStatus::Complete;

                    let final_winner = if match_data.rounds_won_p1 == 2 {
                        match_data.player1
                    } else {
                        match_data.player2
                    };

                    let loser = if final_winner == match_data.player1 {
                        match_data.player2
                    } else {
                        match_data.player1
                    };

                    // Update player stats
                    update_player_stats(
                        ref world, final_winner, loser, match_data.wager_amount
                    );

                    // Emit match complete event
                    world
                        .emit_event(
                            @MatchComplete {
                                match_id, winner: final_winner, prize: match_data.wager_amount * 2
                            }
                        );
                } else {
                    // Initialize next round
                    match_data.current_round += 1;

                    let next_round_commit = RoundCommitment {
                        match_id,
                        round: match_data.current_round,
                        player1_commit: 0,
                        player2_commit: 0,
                        player1_revealed: false,
                        player2_revealed: false,
                        player1_action: 0,
                        player2_action: 0,
                    };

                    world.write_model(@next_round_commit);
                }
            }

            // Write all updates
            world.write_model(@round_commit);
            world.write_model(@match_data);
        }
    }

    // Helper function to resolve round outcome
    // Attack beats Defend, Defend beats Special, Special beats Attack
    fn resolve_round(
        p1_action: u8, p2_action: u8, player1: ContractAddress, player2: ContractAddress
    ) -> ContractAddress {
        // 1 = Attack, 2 = Defend, 3 = Special
        if p1_action == p2_action {
            // Draw - return player1 as default
            return player1;
        }

        if (p1_action == 1 && p2_action == 2) // Attack beats Defend
            || (p1_action == 2 && p2_action == 3) // Defend beats Special
            || (p1_action == 3 && p2_action == 1) // Special beats Attack
        {
            return player1;
        }

        player2
    }

    // Helper function to update player stats
    fn update_player_stats(
        ref world: dojo::world::WorldStorage,
        winner: ContractAddress,
        loser: ContractAddress,
        wager: u256
    ) {
        // Update winner stats
        let mut winner_stats: PlayerStats = world.read_model(winner);
        winner_stats.wins += 1;
        winner_stats.total_wagered += wager;
        winner_stats.total_won += wager * 2;
        world.write_model(@winner_stats);

        // Update loser stats
        let mut loser_stats: PlayerStats = world.read_model(loser);
        loser_stats.losses += 1;
        loser_stats.total_wagered += wager;
        world.write_model(@loser_stats);
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"quick_draw_arena")
        }
    }
}
