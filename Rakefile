require 'fileutils'

task :generate_css do
  files = ["main", "loading", "postform", "post", "reset"]
  files.each do |file|
    sh "cd public/css && lessc #{file}.less #{file}.css"
  end
end

task :restart_npm do
  IO.popen "pgrep node" do | io |
    io.each do |line|
      if line =~ /\d+/
        sh "kill -TERM #{line}"
      end
    end
  end
  sh "NODE_ENV=production forever app.js &"
end

task :generate_docs do
  files = `find . -regex './[^(node_modules)].*\.js' | grep -v 'libs'`
  regex = /^\.\/((.*)\/([^\/]+)\.js|(.*\.js))$/
  files.lines.each do | file |
    file.chomp!
    match = regex.match file
    if !match.nil?
      captures = match.captures
#      puts captures[0] + captures[1]
      sh "./node_modules/.bin/docco #{file} -o ./docs/#{captures[1]}"
    end
  end
end

task :todo do
  sh "grep -nIr --exclude-dir=\"node_modules*\" --exclude-dir=\"libs*\" 'TODO' *"
end

task :default => [:generate_css, :restart_npm] do

end
