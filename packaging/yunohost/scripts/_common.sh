#!/bin/bash
# shellcheck disable=SC1091,SC2154

#=================================================
# COMMON VARIABLES AND CUSTOM HELPERS
#=================================================

#=================================================
# PERSONAL HELPERS
#=================================================

questarrng_prepare_data() {
	local log_file link_target expected_target
	if [[ -L "$data_dir" || ( -e "$data_dir" && ! -d "$data_dir" ) ]]; then
		ynh_die --message="QuestarrNG data path is not a real directory."
	fi
	install -d -o "$app" -g "$app" -m 0750 "$data_dir"
	chown "$app:$app" "$data_dir"

	if [[ -L "$install_dir/data" ]]; then
		local link_target expected_target
		link_target="$(readlink -f -- "$install_dir/data")"
		expected_target="$(readlink -f -- "$data_dir")"
		if [[ "$link_target" != "$expected_target" ]]; then
			ynh_die --message="Refusing to use an unexpected QuestarrNG data symlink."
		fi
	elif [[ -e "$install_dir/data" ]]; then
		ynh_die --message="QuestarrNG's data path exists in the install directory; refusing to replace it."
	else
		ln -s -- "$data_dir" "$install_dir/data"
	fi

	if [[ -L "$data_dir/logs" || ( -e "$data_dir/logs" && ! -d "$data_dir/logs" ) ]]; then
		ynh_die --message="QuestarrNG log path is not a real directory."
	fi
	install -d -o "$app" -g "$app" -m 0750 "$data_dir/logs"
	chown "$app:$app" "$data_dir/logs"

	log_file="$data_dir/logs/questarrng.log"
	if [[ -L "$log_file" || ( -e "$log_file" && ! -f "$log_file" ) ]]; then
		ynh_die --message="QuestarrNG log path is not a regular file."
	fi
	if [[ ! -f "$log_file" ]]; then
		install -o "$app" -g "$app" -m 0640 /dev/null "$log_file"
	fi
	chown "$app:$app" "$log_file"

	if [[ -L "$install_dir/server.log" ]]; then
		link_target="$(readlink -f -- "$install_dir/server.log")"
		expected_target="$(readlink -f -- "$log_file")"
		if [[ "$link_target" != "$expected_target" ]]; then
			ynh_die --message="Refusing to use an unexpected QuestarrNG log symlink."
		fi
	elif [[ -e "$install_dir/server.log" ]]; then
		ynh_die --message="QuestarrNG's server log path exists in the install directory; refusing to replace it."
	else
		ln -s -- "$log_file" "$install_dir/server.log"
	fi
}

questarrng_build_app() {
	local working_directory="$PWD"
	chown -R "$app:$app" "$install_dir"
	cd "$install_dir" || ynh_die --message="Could not enter QuestarrNG's install directory."
	ynh_print_info "Installing QuestarrNG's locked Node.js dependencies..."
	ynh_exec_as_app npm ci --ignore-scripts --no-audit --no-fund 2>&1

	ynh_print_info "Building QuestarrNG..."
	ynh_exec_as_app npm run build 2>&1

	ynh_print_info "Removing development-only Node.js dependencies..."
	ynh_exec_as_app npm prune --omit=dev --ignore-scripts --no-audit --no-fund 2>&1
	cd "$working_directory" || ynh_die --message="Could not return to the package directory."
	chown -R "$app:$app" "$install_dir"
}

questarrng_install_apprise() {
	local venv="$data_dir/apprise-venv"
	if [[ -L "$venv" || ( -e "$venv" && ! -d "$venv" ) ]]; then
		ynh_die --message="QuestarrNG Apprise environment path is not a real directory."
	fi

	ynh_print_info "Installing the hash-locked Apprise CLI..."
	ynh_exec_as_app python3 -m venv "$venv"
	ynh_exec_as_app "$venv/bin/pip" install \
		--disable-pip-version-check \
		--no-cache-dir \
		--require-hashes \
		--only-binary :all: \
		--requirement "$install_dir/security/requirements.txt"
}

questarrng_prepare_service() {
	local log_file="$data_dir/logs/questarrng.log"
	if [[ -L "$log_file" || ( -e "$log_file" && ! -f "$log_file" ) ]]; then
		ynh_die --message="QuestarrNG log path is not a regular file."
	fi
	if [[ ! -f "$log_file" ]]; then
		install -o "$app" -g "$app" -m 0640 /dev/null "$log_file"
	fi
	chown "$app:$app" "$log_file"

	ynh_config_add_nginx
	ynh_config_add_systemd
	ynh_config_add_logrotate "$log_file"
}

questarrng_start_service() {
	local log_file="$data_dir/logs/questarrng.log"
	ynh_systemctl --service="$app" --action="start" \
		--wait_until="HTTP server serving on" \
		--log_path="$log_file"
}

questarrng_register_service() {
	yunohost service add "$app" \
		--description="QuestarrNG video game management service" \
		--log="$data_dir/logs/questarrng.log"
}
