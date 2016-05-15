module.exports = function(grunt) {

  grunt.initConfig({
    package: grunt.file.readJSON("package.json"),

    ts: {
      options: {
        sourceMap: false,
        target: "es5",
        fast: "never"
      },
      distBrowser: {
        files: {
          "release/admin/admin.js": ["admin/*.ts"],
          "release/client/quiz.js": ["client/*.ts"]
        }
      },
      distServer: {
        src: ["server/*.ts", "server/classes/*.ts"],
        out: "release/server/server.js",
        reference: "server/references.ts"
      }
    },

    uglify: {
      options: {
        mangle: true,
        compress: true
      },
      dist: {
        files: {
          "release/client/quiz.js": ["release/client/quiz.js"],
          "release/admin/admin.js": ["release/admin/admin.js"]
        }
      }
    },

    clean: {
      all: ["*.zip"]
    },

    cssmin: {
      dist: {
        files: {
          "release/admin/admin.css": ["admin/admin.css"],
          "release/client/quiz.css": ["client/quiz.css"]
        }
      }
    },

    htmlmin: {
      dist: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },
        files: {
          "release/admin/admin.html": ["admin/admin.html"],
          "release/client/quiz.html": ["client/quiz.html"]
        }
      }
    },

    compress: {
      browser: {
        options: {
          archive: "realtimepolls-release-v<%= package.version %>.zip",
          mode: "zip"
        },
        files: [
          {
            expand: true,
            flatten: true,
            src: ["release/admin/*"],
            dest: "/admin/"
          },
          {
            expand: true,
            flatten: true,
            src: ["release/client/*"],
            dest: "/"
          }
        ]
      },
      server: {
        options: {
          archive: "realtimepolls-server-v<%= package.version %>.zip",
          mode: "zip"
        },
        files: [
          {
            expand: true,
            flatten: true,
            src: ["release/server/*", "!*.ts", "!node_modules"],
            dest: "/"
          }
        ]
      }
    },

    watch: {
      browserHtml: {
        files: ["admin/*.html", "client/*.html"],
        tasks: ["htmlmin"]
      },
      browserCss: {
        files: ["admin/*.css", "client/*.css"],
        tasks: ["cssmin"]
      },
      browserTs: {
        files: ["admin/*.ts", "client/*.ts", "i18n/*.ts"],
        tasks: ["ts:distBrowser"]
      }
    }
  });

  grunt.loadNpmTasks("grunt-ts");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-htmlmin");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("cleanup", () => {
    grunt.file.delete("release/");
    grunt.log.ok("Deleted temporary release directory");
  });

  grunt.registerTask("default", "Assemble release-ready files into server and client ZIPs", () => {
    grunt.file.mkdir("release");
    grunt.log.ok("Created temporary release directory");

    // Clients
    [
      "admin", "client"
    ].forEach(f => [
      "config.json", "language.json"
    ].forEach(s => grunt.file.copy(f + "/" + s, "release/" + f + "/" + s)));
    grunt.log.ok("Copied files for both client and admin");

    // Server
    [
      "package.json", "ManageAdmins", "ManageAdmins.bat", "config.json"
    ].forEach(s => grunt.file.copy("server/" + s, "release/server/" + s));
    grunt.log.ok("Copied server files");

    grunt.task.run("ts", "uglify", "cssmin", "htmlmin", "compress", "cleanup");
  });

};
